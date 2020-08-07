#!/usr/bin/env python3
#  remote-gx-ir/server.py
#  
#  @author Leonardo Laureti <https://loltgt.ga>
#  @version 2020-08-07
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
from xml.etree import ElementTree
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


class DLNAcom():
	def __init__(self):
		if int(config['DLNA']['MODE']):
			srv = self.discover_fast()
		else:
			srv = self.discover_ssdp()

		if srv:
			self.ms = srv[0]
			self.mr = srv[1]
			self.udn = self.get_devicedescription()
		else:
			raise 'ERROR'

		print('DLNAcom', 'test', '__init__', {'ms': self.ms, 'mr': self.mr, 'udn': self.udn})

	def discover_ssdp(self):
		print('DLNAcom', 'discover_ssdp()')

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
			ms = ''
			mr = ''

			while True:
				data, addr = s.recvfrom(65507)

				if addr[0] == config['DLNA']['HOST']:
					location = re.search(r'LOCATION: \w+://([^:]+):(\d+)/(.+)', data.decode('utf-8'))

					#TODO FIX ms === ms
					if location[3].startswith('DeviceDescription.xml') and not ms:
						ms = config['DLNA']['HOST'] + ':' + str(location[2])
					elif not mr:
						mr = config['DLNA']['HOST'] + ':' + str(location[2])

				if ms and mr:
					break
		except socket.timeout:
			print('DLNAcom', 'discover_ssdp()', 'socket.timeout')
		else:
			# print('DLNAcom', 'test', 'discover_ssdp()', (ms, mr))

			return (ms, mr)

	def discover_fast(self):
		print('DLNAcom', 'discover_fast()')

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
			ms = config['DLNA']['HOST'] + ':' + str(int(upnpports[0], 16))
			mr = config['DLNA']['HOST'] + ':' + str(int(upnpports[1], 16))

		if int(config['DLNA']['MODE']) == 2:
			bakiptvname = urllib.parse.quote(bakiptvname)
			bakiptvaddr = urllib.parse.quote(bakiptvaddr[:-10])

			command('iptvsubmit?name=' + bakiptvname + '&protocol=m3u_playlist&address=' + bakiptvaddr + '&user_agent=&handle=7&default_portal=false')

		return (ms, mr)

	def get_devicedescription(self):
		print('DLNAcom', 'get_devicedescription()')

		url = 'http://' + self.ms + '/DeviceDescription.xml';

		try:
			request = urllib.request.urlopen(url, timeout=int(config['DLNA']['REQUEST_TIMEOUT']))
			response = request.read()
		except (urllib.error.HTTPError, urllib.error.URLError) as err:
			print('DLNAcom', 'get_devicedescription()', 'error:', 'urllib.error', err)

			return False

		try:
			xmlRoot = ElementTree.fromstring(response)
			udn = xmlRoot.find('./{urn:schemas-upnp-org:device-1-0}device/{urn:schemas-upnp-org:device-1-0}UDN').text
			udn = udn[5:]
		except Exception as err:
			print('DLNAcom', 'get_devicedescription()', 'error', err)

			return None
		
		# print('DLNAcom', 'test', 'get_devicedescription()', udn)

		return udn

	def browse(self, level=0, objectid=0, browseflag='BrowseDirectChildren', requestedcount=9999):
		print('DLNAcom', 'browse()')

		url = 'http://' + self.ms + '/ContentDirectory/' + self.udn + '/control.xml';
		payload = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>' \
				'<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' \
				'<s:Body>' \
				'<u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">' \
				'<ObjectID>' + str(objectid) + '</ObjectID>' \
				'<BrowseFlag>' + browseflag + '</BrowseFlag>' \
				'<Filter>*</Filter>' \
				'<StartingIndex>0</StartingIndex>' \
				'<RequestedCount>' + str(requestedcount) + '</RequestedCount>' \
				'<SortCriteria></SortCriteria>' \
				'</u:Browse>' \
				'</s:Body>' \
				'</s:Envelope>'
		headers = {'Soapaction': '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse', 'Content-type': 'text/xml;charset="utf-8"'}

		try:
			req = urllib.request.Request(url, data=payload.encode('utf-8'), headers=headers, method='POST')
			req.timeout = int(config['DLNA']['REQUEST_TIMEOUT'])

			with urllib.request.urlopen(req) as request:
				response = request.read()
		except (urllib.error.HTTPError, urllib.error.URLError) as err:
			print('DLNAcom', 'browse()', 'urllib.error', err)

			return False
		
		# print('DLNAcom', 'test', 'browse()', response)

		results = {}

		if level:
			el = 'item'
			objclass = 'object.item'
		else:
			el = 'container'
			objclass = 'object.container'

		try:
			xmlRoot = ElementTree.fromstring(response)
			elements = xmlRoot.find('.//*Result').text

			if not elements:
				return None

			index = 0
			xmlRoot = ElementTree.fromstring(elements)
			elements = xmlRoot.findall('./{urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/}' + el)

			for element in elements:
				if element.find('./{urn:schemas-upnp-org:metadata-1-0/upnp/}class').text.find(objclass) > -1:
					id = element.get('id')
					name = element.find('./{http://purl.org/dc/elements/1.1/}title').text

					result = {'id': id, 'name': html.escape(name)}

					res = element.find('./{urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/}res')
					if res.text:
						result['res'] = res.text

					if objectid == 'hdhomerun://localhost:/':
						channel = result['name'].split('  ')
						chinfo = channel[0].split(' ')
						chnum = re.search(r'/(\d+)\.ts', result['id'])[1]
						chnum = int(chnum)
						chnum += 1

						result['num'] = chnum

						if len(chinfo) > 1:
							result['cnum'] = int(chinfo[0])

						if len(chinfo) == 2:
							result['cas'] = True
						else:
							result['cas'] = False

						if len(channel) == 2 and channel[1]:
						 	result['name'] = channel[1]
						elif len(channel) == 3 and channel[2]:
						 	result['name'] = channel[2]

						results[chnum] = result
					else:
						results[index] = result

					index += 1
		except Exception as err:
			print('DLNAcom', 'browse()', 'error', err)

			return None

		# print('DLNAcom', 'test', 'browse()', results)

		return results


def to_JSON(obj):
	return json.dumps(obj, separators=(',', ':')).encode('utf-8')



def command(uri):
	print('command()', uri)

	url = 'http://' + config['WEBIF']['HOST'] + '/' + uri

	try:
		request = urllib.request.urlopen(url, timeout=int(config['WEBIF']['TIMEOUT']))
		mimetype = request.info()['Content-Type']
		response = request.read()
	except (urllib.error.HTTPError, urllib.error.URLError) as err:
		print('command()', 'error:', 'urllib.error', err)

		return False

	return {'data': response, 'headers': {'Content-Type': mimetype}}


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
		bs = {'name': '', 'userbouquets': []}

		for line in bouquet:
			if line.startswith('#SERVICE'):
				filename = re.search(r'(?:")([^"]+)(?:")', line)[1]

				bs['userbouquets'].append(filename)
			elif line.startswith('#NAME'):
				bs['name'] = line.lower()

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
				ub['name'] = html.escape(line[6:].split('  ')[0])
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
			path = os.path.basename(path)
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

		if int(config['E2']['CACHE']) and not os.path.isdir(e2cache):
			os.mkdir(e2cache)

		dirlist = ftp.nlst(e2root)

		for path in dirlist:
			path = os.path.basename(path)
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
			data = retrieve()

			if not data:
				data = restore()
		else:
			e2db = get_e2db_ftp()

			data = parse_e2db(e2db)
			data = to_JSON(data)

			if int(config['E2']['CACHE']):
				store(data)
	except Exception as err:
		print('chlist()', 'error:', err)

		return False

	return {'data': data, 'headers': {'Content-Type': 'application/json'}}


def dlna(uri):
	print('dlna()', uri)

	if not int(config['DLNA']['ENABLE']):
		print('dlna()', 'not enabled')

		return False

	def restore(data):
		print('dlna()', 'restore()')

		if not data['channels']:
			return None

		for index in data['channels']:
			res = re.sub(r'//([^/]+)', '//' + data['ms'], data['channels'][index]['res'])

			data['channels'][index]['res'] = res

		return data['channels']

	def update(data):
		print('dlna()', 'update()')

		data['channels'] = dlna.browse(level=1, objectid='hdhomerun://localhost:/')

		data = to_JSON(data)

		if int(config['DLNA']['CACHE']):
			store(data)

		return data

	def retrieve():
		print('dlna()', 'retrieve()')

		cachefile = config['DLNA']['CACHE_FILE']

		if not os.path.isfile(cachefile):
			return None

		with open(cachefile, 'rb') as input:
			return input.read()

	def store(cache):
		print('dlna()', 'store()')

		cachefile = config['DLNA']['CACHE_FILE']

		with open(cachefile, 'wb') as output:
			output.write(cache)

	if not uri.startswith('livetv'):
		print('dlna()', 'error', 'not implemented')

		return None

	data = {}

	try:
		if not uri.endswith('update') and int(config['DLNA']['CACHE']):
			data = retrieve()

			if data:
				data = json.loads(data)
			else:
				data = {}

		dlna = DLNAcom()

		if uri.startswith('livetv/direct'):
			chnum = int(uri.split('/')[2])
			chnum -= 1
			objectid = 'hdhomerun://localhost:/' + str(chnum) + '.ts'

			data['channel'] = dlna.browse(level=1, objectid=objectid, browseflag='BrowseMetadata', requestedcount=1)

			data = to_JSON(data)
		else:
			data['ms'] = dlna.ms
			data['mr'] = dlna.mr
			data['udn'] = dlna.udn

			if 'channels' in data and int(config['DLNA']['CACHE']):
				data['channels'] = restore(data)

				if data['channels']:
					data = to_JSON(data)

					store(data)
				else:
					data = update(data)
			else:
				data = update(data)
	except Exception as err:
		print('dlna()', 'error', err)

	return {'data': data, 'headers': {'Content-Type': 'application/json'}}


def mirror(uri):
	print('mirror()', uri)

	if not int(config['MIRROR']['ENABLE']):
		print('mirror()', 'not enabled')

		return False

	def get_ftpsource(ftp):
		print('mirror()', 'get_ftpsource()')

		dircwd = '/../..' + config['MIRROR']['DRIVE'].rstrip('/')
		dirlist = ftp.nlst(dircwd)

		if dircwd + '/timeshift' in dirlist:
			dirlist = ftp.nlst(dircwd + '/timeshift')

			if dirlist:
				dirlist = ftp.nlst(dirlist[0])

				if dirlist:
					path = os.path.basename(dirlist[0])
					dirlist = ftp.nlst(dircwd + '/timeshift/' + path + '/' + path)

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

	def dlna_trick(dlna):
		print('mirror()', 'dlna_trick()')

		try:
			control = dlna.browse(level=1, objectid='control://localhost/exit.mpg', browseflag='BrowseMetadata', requestedcount=1)
			urllib.request.urlopen(control[0]['res'], timeout=int(config['DLNA']['REQUEST_TIMEOUT']))
		except (urllib.error.HTTPError, urllib.error.URLError):
			pass
		except Exception as err:
			print('mirror()', 'dlna_trick()', 'error', err)

	def close():
		print('mirror()', 'close()')

		suppressthreads()

		return {'data': b'OK'}

	def suppressthreads():
		if 'mirror:threads' in globals():
			print('mirror()', 'suppressthreads()')

			# if 'ftp' in globals()['mirror:threads']:
			# 	globals()['mirror:threads']['ftp'].close()

			if 'cache' in globals()['mirror:threads']:
				globals()['mirror:threads']['cache'].kill()

			if 'dlna' in globals()['mirror:threads']:
				dlna_trick(globals()['mirror:threads']['dlna'])

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

		data = {}

		ftp = None
		srcurl = ''

		if int(config['MIRROR']['FTP']):
			ftp = FTPcom().open()

			globals()['mirror:threads']['ftp'] = ftp

			src = get_ftpsource(ftp)

			if src:
				srcurl = src.replace('@', ':' + config['FTP']['PASS'] + '@')

				data['ftpurl'] = 'ftp://' + config['FTP']['USER'] + '@' + config['FTP']['HOST'] + src

		if int(config['MIRROR']['CACHE']) and src:
			cachefile = config['MIRROR']['CACHE_FILE']
			retrydelay = int(config['MIRROR']['CACHE_RETRY_DELAY'])

			thread_cache = KThread(target=cache, args=[ftp, src, cachefile, retrydelay])
			thread_cache.start()

			globals()['mirror:threads']['cache'] = thread_cache

		if int(config['MIRROR']['DLNA']) and int(config['DLNA']['ENABLE']):
			dlna = DLNAcom()

			chnum = int(uri)
			chnum -= 1
			objectid = 'hdhomerun://localhost:/' + str(chnum) + '.ts'
			dlnachannel = dlna.browse(level=1, objectid=objectid, browseflag='BrowseMetadata', requestedcount=1)
			dlnaurl = dlnachannel[0]['res']

			data['dlnaurl'] = dlnaurl

			thread_dlna_trick = KThread(target=dlna_trick, args=[dlna])
			thread_dlna_trick.start()

			globals()['mirror:threads']['dlna'] = dlna

		if int(config['MIRROR']['STREAM']) and src:
			streamurl = 'rtp://' + config['MIRROR']['STREAM_HOST'] + ':' + config['MIRROR']['STREAM_PORT']

			data['streamurl'] = streamurl

			thread_stream = KThread(target=stream, args=[srcurl, streamurl, cachefile])
			thread_stream.start()

			globals()['mirror:threads']['stream'] = thread_stream
	except Exception as err:
		print('mirror()', 'error:', err)

		return False

	return {'data': to_JSON(data), 'headers': {'Content-Type': 'application/json'}}


class Handler(SimpleHTTPRequestHandler):
	def service(self):
		fn = self.path.split('/')[2];
		uri = os.path.relpath(self.path, '/service/' + fn)

		print('Handler', 'service()', fn)

		response = False

		if fn in ['command', 'chlist', 'dlna', 'mirror']:
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
