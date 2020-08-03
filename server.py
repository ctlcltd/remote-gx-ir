#!/usr/bin/env python3
#  remote-gx-ir/server.py
#  
#  @author Leonardo Laureti <https://loltgt.ga>
#  @version 2020-08-03
#  @license MIT License
#  

import configparser
import os
import re
import urllib.request, urllib.parse, urllib.error
import json
import html
from io import BytesIO
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
from ftplib import FTP
import socket
import time
import threading
import sys
import queue
import subprocess


# A subclass of threading.Thread, with a kill() method.
# @link http://mail.python.org/pipermail/python-list/2004-May/281943.html
class KThread(threading.Thread):
	def __init__(self, *args, **keywords):
		threading.Thread.__init__(self, *args, **keywords)
		self.killed = False

	def start(self):
		# Start the thread.
		self.__run_backup = self.run
		self.run = self.__run		# Force the Thread to install our trace.
		threading.Thread.start(self)

	def __run(self):
		# Hacked run function, which installs the trace.
		sys.settrace(self.globaltrace)
		self.__run_backup()
		self.run = self.__run_backup

	def globaltrace(self, frame, why, arg):
		if why == 'call':
			return self.localtrace
		else:
			return None

	def localtrace(self, frame, why, arg):
		if self.killed:
			if why == 'line':
				raise SystemExit()
		return self.localtrace

	def kill(self):
		self.killed = True


class FTPcom(FTP):
	def __init__(self, *args, **keywords):
		FTP.__init__(self, *args, **keywords)

	def open(self):
		connect = self.connect(host=config['FTP']['HOST'], port=int(config['FTP']['PORT']))
		login = self.login(user=config['FTP']['USER'], passwd=config['FTP']['PASS'])

		print('FTPcom', 'open()', self.getwelcome())

		if connect.startswith('220') and login.startswith('230'):
			return self
		else:
			self.close()

			raise Exception('FTPcom', 'could not connect', [connect, login])

	def retrieve(self, source, outfile, close=False, read=False):
		print('FTPcom', 'retrieve()', 'START')

		q = queue.Queue()

		def retry(start=None):
			self.retrbinary('RETR ' + source, callback=q.put, rest=start)
			q.put(None)

		threading.Thread(target=retry).start()

		with open(outfile, 'wb') as output:
			while True:
				chunk = q.get()

				if chunk is not None:
					print('FTPcom', 'retrieve()', 'REST')

					output.write(chunk)
				else:
					print('FTPcom', 'retrieve()', 'END')

					if close:
						self.close()

					break

		if read:
			with open(outfile, 'rb') as input:
				return input.read()

	def retrievechunked(self, source, outfile, retry_delay, close=False, read=False):
		print('FTPcom', 'retrievechunked()', 'START')

		q = queue.Queue()

		def retry(start=None):
			self.retrbinary('RETR ' + source, callback=q.put, rest=start)
			q.put(None)

		threading.Thread(target=retry).start()

		with open(outfile, 'wb') as output:
			size = 0
			last = 0

			while True:
				chunk = q.get()
				size = output.tell()

				if chunk is not None:
					output.write(chunk)
				elif not size == last:
					time.sleep(retry_delay)

					print('FTPcom', 'retrievechunked()', 'REST', size)

					retry(size)

					last = output.tell()
				else:
					print('FTPcom', 'retrievechunked()', 'END', size, last)

					if close:
						self.close()

					break

		if read:
			with open(outfile, 'rb') as input:
				return input.read()

	def close(self):
		print('FTPcom', 'close()', self.quit())


class UPNPcom():
	def __init__(self):
		global upnp

		upnp = {}

		if int(config['DLNA']['MODE']):
			upnp['server'] = self.fast_discover()
		else:
			upnp['server'] = self.ssdp_discover()

		self.get_devicedescription()

	def ssdp_discover(self):
		print('UPNPcom', 'ssdp_discover()')

		msg = \
			'M-SEARCH * HTTP/1.1\r\n' \
			'HOST:239.255.255.250:1900\r\n' \
			'ST:upnp:rootdevice\r\n' \
			'MX:' + config['DLNA']['SSDP_TIMEOUT'] + '\r\n' \
			'MAN:"ssdp:discover"\r\n' \
			'\r\n'

		s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
		s.settimeout(int(config['DLNA']['SSDP_TIMEOUT']))
		s.sendto(msg.encode('utf-8'), ('239.255.255.250', 1900))

		try:
			msport = ''
			mrport = ''

			while True:
				data, addr = s.recvfrom(65507)

				if addr[0] == config['DLNA']['HOST']:
					location = re.search(r'LOCATION: \w+://([^:]+):(\d+)/(.+)', data.decode('utf-8'))

					if location[3].startswith('DeviceDescription.xml') and not msport:
						msport = str(location[2])
					elif not mrport:
						mrport = str(location[2])

				if msport and mrport:
					break

			return {'host': config['DLNA']['HOST'], 'ms': msport, 'mr': mrport}
		except socket.timeout:
			pass

	def fast_discover(self):
		print('UPNPcom', 'fast_discover()')

		try:
			cmd = command('iptvs.json')
			data = json.loads(cmd['data'])
		except Exception as err:
			print('UPNPcom', 'fast_discover()', 'error', err)

			return False

		bakiptvname = data['iptvs'][0]['name']
		bakiptvaddr = data['iptvs'][0]['server']

		if bakiptvaddr.find('#'):
			upnpports = bakiptvaddr[-9:].split('|')
			msport = str(int(upnpports[0], 16))
			mrport = str(int(upnpports[1], 16))

		if int(config['DLNA']['MODE']) == 2:
			bakiptvname = urllib.parse.quote(bakiptvname)
			bakiptvaddr = urllib.parse.quote(bakiptvaddr[:-10])

			command('iptvsubmit?name=' + bakiptvname + '&protocol=m3u_playlist&address=' + bakiptvaddr + '&user_agent=&handle=7&default_portal=false')

		return {'host': config['DLNA']['HOST'], 'ms': msport, 'mr': mrport}

	def get_devicedescription(self):
		print('UPNPcom', 'get_devicedescription()')

		global upnp

		if not upnp['server']:
			return None

		url = 'http://' + upnp['server']['host'] + ':' + upnp['server']['ms'] + '/DeviceDescription.xml';

		print(upnp)

		try:
			request = urllib.request.urlopen(url, timeout=int(config['DLNA']['REQUEST_TIMEOUT']))
			data = request.read()
		except (urllib.error.HTTPError, urllib.error.URLError) as err:
			print('command()', 'error:', 'urllib.error', err)

			return False
		else:
			print('UPNPcom', 'test', 'get_devicedescription()', data)

			return data



def to_JSON(obj):
	return json.dumps(obj, separators=(',', ':')).encode('utf-8')



def command(uri):
	print('command()', uri)

	url = 'http://' + config['WEBIF']['HOST'] + '/' + uri

	try:
		request = urllib.request.urlopen(url, timeout=int(config['WEBIF']['TIMEOUT']))
		mimetype = request.info()['Content-Type']
		data = request.read()
	except (urllib.error.HTTPError, urllib.error.URLError) as err:
		print('command()', 'error:', 'urllib.error', err)

		return False

	return {'data': data, 'headers': {'Content-Type': mimetype}}


def chlist(uri):
	print('chlist()', uri)

	def parse_e2db(e2db):
		print('chlist()', 'parse_e2db()')

		chlist = {}
		chlist['lamedb'] = parse_e2db_lamedb(e2db['lamedb'])

		bouquets = filter(lambda path: path.startswith('bouquets.'), e2db)

		for filename in bouquets:
			db = parse_e2db_bouquet(e2db[filename])

			for filename in db['userbouquets']:
				name = re.match(r'[^.]+.(\d+).(\w+)', filename)
				idx = name[2] + ':' + name[1]

				chlist[idx] = parse_e2db_userbouquet(chlist['lamedb']['list'], e2db[filename])

		return chlist

	def parse_e2db_lamedb(lamedb):
		print('chlist()', 'parse_e2db_lamedb()')

		db = {'name': 'ALL', 'list': {}}

		step = False
		count = 0
		index = 0
		chid = ''

		for line in lamedb:
			if not step and line == 'services':
				step = True
				continue
			elif step and line == 'end':
				step = False
				continue

			if step:
				count += 1

				if count == 1:
					chid = line[:-5].upper().split(':')
					chid = chid[0].lstrip('0') + ':' + chid[2].lstrip('0') + ':' + chid[3].lstrip('0') + ':' + chid[1].lstrip('0')
					index += 1
				elif count == 2:
					db['list'][chid] = {}
					db['list'][chid]['num'] = index
					db['list'][chid]['name'] = html.escape(line)
				elif count == 3:
					count = 0
					chid = ''

		return db

	def parse_e2db_bouquet(bouquet):
		bs = {'prefix': '', 'userbouquets': []}

		for line in bouquet:
			if line.startswith('#SERVICE'):
				filename = re.search(r'(?:")([^"]+)(?:")', line)[1]

				print(filename)

				bs['userbouquets'].append(filename)
			elif line.startswith('#NAME'):
				prefix = line

				bs['name'] = prefix.lower()

		return bs

	def parse_e2db_userbouquet(chlist_lamedb, userbouquet):
		print('chlist()', 'parse_e2db_userbouquet()')

		ub = {'name': '', 'list': {}}
		step = False
		index = 0;

		for line in userbouquet:
			if step and line.startswith('#SORT'):
				step = False
				continue
			elif not step and line.startswith('#NAME'):
				ub['name'] = html.escape(line[6:])
				step = True
				continue

			if step:
				index += 1

				chid = line[9:-15].split(':')
				chid = chid[3] + ':' + chid[4] + ':' + chid[5] + ':' + chid[6]

				if chid in chlist_lamedb:
					ub['list'][chid] = {}
					ub['list'][chid]['num'] = index
					ub['list'][chid]['name'] = chlist_lamedb[chid]['name']

		return ub

	def get_ftpfile(ftp, filename):
		print('chlist()', 'get_ftpfile()')

		try:
			reader = BytesIO()
			ftp.retrbinary('RETR ' + filename, reader.write)
			return reader.getvalue()
		except Exception as err:
			print('chlist()', 'get_ftpfile()', 'error:', err)
		except:
			print('chlist()', 'get_ftpfile()', 'error')

	def get_e2db_ftp():
		print('chlist()', 'get_e2db_ftp()')

		e2db = {}

		try:
			ftp = FTPcom().open()
			e2db = update(ftp)
		except Exception as err:
			print('chlist()', 'get_e2db_ftp()', 'error:', err)
		except:
			print('chlist()', 'get_e2db_ftp()', 'error')
		#TODO FIX
		# else:
		# 	ftp.close()

		return e2db

	def get_e2db_localcache():
		print('chlist()', 'get_e2db_localcache()')

		e2db = {}
		e2cache = config['E2']['CACHE_DB'].rstrip('/')
		dirlist = os.listdir(e2cache)

		for path in dirlist:
			filename = e2cache + '/' + path

			#TODO
			#-filter exclude
			#-filter allowed

			with open(filename, 'rb') as input:
				e2db[path] = input.read().decode('utf-8').splitlines()

		return e2db

	def update(ftp):
		print('chlist()', 'update()')

		e2db = {}
		e2cache = config['E2']['CACHE_DB'].rstrip('/')
		e2root = config['E2']['ROOT'].rstrip('/')
		dirlist = ftp.nlst(e2root)

		for path in dirlist:
			filename = e2root + '/' + path

			#TODO
			#-filter allowed
			#--filter exclude

			if int(config['E2']['CACHE']):
				e2db[path] = ftp.retrieve(filename, e2cache + '/' + path, read=True).decode('utf-8').splitlines()
			else:
				e2db[path] = get_ftpfile(ftp, filename).decode('utf-8').splitlines()

		return e2db

	def restore():
		print('chlist()', 'restore()')

		e2cache = config['E2']['CACHE_DB'].rstrip('/')

		if int(config['E2']['CACHE']):
			e2db = get_e2db_localcache()
		else:
			e2db = get_e2db_ftp()

		chlist = parse_e2db(e2db)
		chlist = to_JSON(chlist)

		store(chlist)

		return chlist

	def retrieve():
		print('chlist()', 'retrieve()')

		cachefile = config['E2']['CACHE_FILE']

		if not os.path.isfile(cachefile):
			return None

		with open(cachefile, 'rb') as input:
			return input.read()

	def store(cache):
		print('chlist()', 'store()')

		cachefile = config['E2']['CACHE_FILE']

		with open(cachefile, 'wb') as output:
			output.write(cache)

	try:
		if not uri == 'update' and int(config['E2']['CACHE']):
			chlist = retrieve()

			if not chlist:
				chlist = restore()
		else:
			e2db = get_e2db_ftp()

			chlist = parse_e2db(e2db)
			chlist = to_JSON(chlist)

			if int(config['E2']['CACHE']):
				store(chlist)
	except Exception as err:
		print('chlist()', 'error:', err)

		return False

	print(chlist)

	return {'data': chlist, 'headers': {'Content-Type': 'application/json'}}


def mirror(uri):
	print('mirror()', uri)

	def get_ftpsource(ftp):
		print('mirror()', 'get_ftpsource()')

		dircwd = '/../..' + config['MIRROR']['DRIVE'].rstrip('/')
		dirlist = ftp.nlst(dircwd)

		if dircwd + '/timeshift' in dirlist:
			dirlist = ftp.nlst(dircwd + '/timeshift')

			if dirlist:
				dirlist = ftp.nlst(dirlist[0])

				#TODO

				if dirlist:
					dirlist = ftp.nlst(dirlist[0])

					if dirlist:
						return str(dirlist[0])

		return None

	def cache(ftp, src, cachefile, retrydelay):
		print('mirror()', 'cache()')

		if int(config['MIRROR']['FTP']):
			ftp.retrievechunked(src, cachefile, retrydelay)

	def stream(srcurl, streamurl, cachefile):
		print('mirror()', 'stream()')

		time.sleep(int(config['MIRROR']['STREAM_START_DELAY']))

		if not subprocess.getstatusoutput('ffmpeg')[0]:
			print('mirror()', 'stream()', 'error: missing "ffmpeg"')

			return

		streampipe  = 'ffmpeg'
		streampipe += ' -fflags +discardcorrupt'
		# streampipe += ' -fflags +discardcorrupt+fastseek+nobuffer'
		streampipe += ' -stream_loop ' + config['MIRROR']['STREAM_LOOP']
		streampipe += ' -sseof ' + config['MIRROR']['STREAM_SEEK_EOF']
		streampipe += ' -re'

		if int(config['MIRROR']['CACHE']) and cachefile:
			streampipe += ' -i ' + cachefile
		else:
			streampipe += ' -i ' + srcurl

		streampipe += ' -bufsize ' + config['MIRROR']['STREAM_BUFSIZE']
		streampipe += ' -c copy'
		streampipe += ' -f rtp_mpegts ' + streamurl

		stream = subprocess.Popen(streampipe.split(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)

		if stream.stdout:
			print('mirror()', 'streaming at', config['MIRROR']['STREAM_HOST'] + ':' + config['MIRROR']['STREAM_PORT'])

			count = 0

			for line in stream.stdout:
				count += 1

				print(line)

				if line == 'Press [q] to stop, [?] for help\n':
					count = 149
				elif count == 150:
					break
		else:
			print('mirror()', 'stream()', 'streaming failed')

	def close():
		print('mirror()', 'close()')

		suppressthreads()

		return {'data': b'OK'}

	def suppressthreads():
		if 'mirror:threads' in globals():
			print('mirror()', 'suppressthreads()')

			if 'ftp' in globals()['mirror:threads']:
				globals()['mirror:threads']['ftp'].close()

			if 'cache' in globals()['mirror:threads']:
				globals()['mirror:threads']['cache'].kill()

			if 'stream' in globals()['mirror:threads']:
				globals()['mirror:threads']['stream'].kill()

				ffmpeg_pid = subprocess.run(['pgrep', 'ffmpeg'])

				#TODO FIX

				if ffmpeg_pid.stdout:
					subprocess.run(['kill', str(ffmpeg_pid)])
				else:
					subprocess.run(['killall', 'ffmpeg'])

			return

		globals()['mirror:threads'] = {}

	try:
		if uri == 'close':
			return close()

		suppressthreads()

		mirror = {}

		ftp = None
		srcurl = ''

		if int(config['MIRROR']['FTP']):
			ftp = FTPcom().open()

			globals()['mirror:threads']['ftp'] = ftp

			#TODO FIX
			#src = NoneType
			src = get_ftpsource(ftp)
			srcurl = src.replace('@', ':' + config['FTP']['PASS'] + '@')

			mirror['ftpurl'] = 'ftp://' + config['FTP']['USER'] + '@' + config['FTP']['HOST'] + src

		if int(config['MIRROR']['CACHE']):
			cachefile = config['MIRROR']['CACHE_FILE']
			retrydelay = int(config['MIRROR']['CACHE_RETRY_DELAY'])

			cache_thread = KThread(target=cache, args=[ftp, src, cachefile, retrydelay])
			cache_thread.start()

			globals()['mirror:threads']['cache'] = cache_thread

		if int(config['MIRROR']['STREAM']):
			streamurl = 'rtp://' + config['MIRROR']['STREAM_HOST'] + ':' + config['MIRROR']['STREAM_PORT']

			mirror['streamurl'] = streamurl

			stream_thread = KThread(target=stream, args=[srcurl, streamurl, cachefile])
			stream_thread.start()

			globals()['mirror:threads']['stream'] = stream_thread
	except Exception as err:
		print('mirror()', 'error:', err)

		return False

	return {'data': to_JSON(mirror), 'headers': {'Content-Type': 'application/json'}}


class Handler(SimpleHTTPRequestHandler):
	def service(self):
		fn = self.path.split('/')[2];
		uri = os.path.relpath(self.path, '/service/' + fn)

		print('Handler', 'service()', fn)

		response = False

		if fn in ['command', 'chlist', 'mirror']:
			response = globals()[fn](uri)

		if response:
			self.send_response(200)
			if 'headers' in response:
				for key, value in response['headers'].items():
					self.send_header(key, value)
			else:
				self.send_header('Content-Type', 'text/plain')
			self.end_headers()
			self.wfile.write(response['data'])
		else:
			self.send_response(401)
			self.end_headers()
			self.wfile.write(b'ERROR')

	def do_GET(self):
		basename = os.path.basename(self.path)

		if self.path.startswith('/service'):
			return self.service()
		elif basename == 'server.py' or basename == 'settings.ini':
			self.send_response(403)
			self.end_headers()
			return

		return SimpleHTTPRequestHandler.do_GET(self)



def run(server_class=TCPServer, handler_class=Handler):
	server_host = config['SERVER']['HOST']
	server_port = int(config['SERVER']['PORT'])
	server = server_class((server_host, server_port), handler_class)

	print('run()', 'serving at', config['SERVER']['HOST'] + ':' + config['SERVER']['PORT'])

	try:
		server.serve_forever()
	except KeyboardInterrupt:
		pass

	server.shutdown()
	server.server_close()

	print('run()', 'closing connection')

if __name__ == '__main__':
	global config

	config = configparser.ConfigParser()

	try:
		config.read('settings.ini')
	except:
		pass
	else:
		run()
