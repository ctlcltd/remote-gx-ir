#!/usr/bin/env python3
#  remote-gx-ir/server.py
#  
#  @author Leonardo Laureti <https://loltgt.ga>
#  @version 2020-08-01
#  @license MIT License
#  

import configparser
import os.path
import urllib.request, urllib.error
import json
from io import BytesIO
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
from ftplib import FTP
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


def command(uri):
	print('command()', uri)

	url = 'http://' + config['WEBIF']['WEBIF_HOST'] + '/' + uri

	try:
		request = urllib.request.urlopen(url, timeout=2)
		mimetype = request.info()['Content-Type']
		data = request.read()
	except (urllib.error.HTTPError, urllib.error.URLError) as err:
		print('command()', 'error: urllib.error', err)

		return False

	return {'data': data, 'headers': {'Content-Type': mimetype}}

def chlist(uri):
	print('chlist()', uri)

	def ftpquit(ftp):
		if not ftp:
			return

		ftpquit = ftp.quit()

		print('chlist()', 'ftp', ftpquit)	

	ftp = FTP()
	ftpconnect = ftp.connect(host=config['FTP']['FTP_HOST'], port=int(config['FTP']['FTP_PORT']))
	ftplogin = ftp.login(user=config['FTP']['FTP_USER'], passwd=config['FTP']['FTP_PASS'])

	print('chlist()', 'ftp', ftp.getwelcome())

	channel_list = {}

	if ftpconnect.startswith('220') and ftplogin.startswith('230'):
		dircwd = config['E2']['E2_ROOT'] + '/' + config['E2']['E2_LAMEDB']
		reader = BytesIO()
		ftp.retrbinary('RETR ' + dircwd, reader.write)
		lamedb = reader.getvalue()

		dircwd = config['E2']['E2_ROOT'] + '/' + config['E2']['E2_USERBOUQUET_TV']
		reader = BytesIO()
		ftp.retrbinary('RETR ' + dircwd, reader.write)
		userbouquet = reader.getvalue()
	else:
		ftpquit()

		print('chlist()', 'error: ftp', ftpconnect, ftplogin)

		return False

	channel_list['db'] = {}
	write = False
	count = 0
	chid = ''

	for line in lamedb.splitlines():
		line = line.decode('utf-8')

		if not write and line == 'services':
			write = True
			continue
		elif write and line == 'end':
			write = False
			continue

		if write:
			count += 1

			if count == 1:
				chid = line[:-5].upper().split(':')
				chid = chid[0].lstrip('0') + ':' + chid[2].lstrip('0') + ':' + chid[3].lstrip('0') + ':' + chid[1].lstrip('0')
			elif count == 2:

				channel_list['db'][chid] = line
			elif count == 3:
				count = 0
				chid = ''

	ubname = ''
	ubouquet = []
	write = False

	for line in userbouquet.splitlines():
		line = line.decode('utf-8')

		if not write and line.startswith('#NAME'):
			name = line[6:]
			write = True
			continue
		elif write and line.startswith('#SORT'):
			write = False
			continue

		if write:
			chid = line[9:-15].split(':')
			chid = chid[3] + ':' + chid[4] + ':' + chid[5] + ':' + chid[6]
			ubouquet.append(chid)

	channel_list['tv:1'] = {'name': name, 'list': {}}

	index = 0;

	for chid in ubouquet:
		index += 1

		if chid in channel_list['db']:
			channel_list['tv:1']['list'][chid] = {}
			channel_list['tv:1']['list'][chid]['num'] = index
			channel_list['tv:1']['list'][chid]['name'] = channel_list['db'][chid]

	ftpquit(ftp)

	return {'data': json.dumps(channel_list).encode('utf-8'), 'headers': {'Content-Type': 'application/json'}}

def mirror(uri):
	print('mirror()', uri)

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

	def ftpretrievechunked(ftp, source, cache):
		print('mirror()', 'ftpretrievechunked()')

		q = queue.Queue()

		def ftpthreadretry(start=None):
			ftp.retrbinary('RETR ' + source, callback=q.put, rest=start)
			q.put(None)

		ftp_thread = threading.Thread(target=ftpthreadretry)
		ftp_thread.start()

		with open(cache, 'wb') as output:
			size = 0
			last = 0

			while True:
				chunk = q.get()
				size = output.tell()

				if chunk is not None:
					output.write(chunk)
				elif not size == last:
					time.sleep(int(config['MIRROR']['CACHE_RETRY_DELAY']))

					print('mirror()', 'ftpretrievechunked()', 'REST', size)

					ftpthreadretry(size)

					last = output.tell()
				else:
					print('mirror()', 'ftpretrievechunked()', 'END', size, last)

					return

	def ftpquit(ftp):
		if not ftp:
			return

		ftpquit = ftp.quit()

		print('mirror()', 'ftpquit()', ftpquit)

	if 'mirror:threads' in globals():
		print('mirror()', 'kill previous threads')

		if 'cache' in globals()['mirror:threads']:
			globals()['mirror:threads']['cache'].kill()

		if 'stream' in globals()['mirror:threads']:
			globals()['mirror:threads']['stream'].kill()

			ffmpeg_pid = subprocess.run(['pgrep', 'ffmpeg'])

			if ffmpeg_pid.stdout:
				subprocess.run(['kill', str(ffmpeg_pid)])
			else:
				subprocess.run(['killall', 'ffmpeg'])

	if uri == 'close':
		return {'data': b'OK'}

	srcurl = ''
	ftpurl = ''

	ftp = FTP()
	ftpconnect = ftp.connect(host=config['FTP']['FTP_HOST'], port=int(config['FTP']['FTP_PORT']))
	ftplogin = ftp.login(user=config['FTP']['FTP_USER'], passwd=config['FTP']['FTP_PASS'])

	print('mirror()', 'ftp', ftp.getwelcome())

	if ftpconnect.startswith('220') and ftplogin.startswith('230'):
		dircwd = '/../..' + config['MIRROR']['DRIVE'].rstrip('/')
		dirlist = ftp.nlst(dircwd)

		if dircwd + '/timeshift' in dirlist:
			dirlist = ftp.nlst(dircwd + '/timeshift')

			if dirlist:
				dirlist = ftp.nlst(dirlist[0])

				if dirlist:
					dirlist = ftp.nlst(dirlist[0])

					if dirlist:
						filesrc = str(dirlist[0])

						ftpurl = 'ftp://' + config['FTP']['FTP_USER'] + '@' + config['FTP']['FTP_HOST']
						ftpurl += filesrc
	else:
		ftpquit()

		print('mirror()', 'error: ftp', ftpconnect, ftplogin)

		return False

	mirror = {}

	if ftpurl:
		mirror['ftpurl'] = ftpurl

		srcurl = ftpurl.replace('@', ':' + config['FTP']['FTP_PASS'] + '@')

	if srcurl:
		globals()['mirror:threads'] = {}

		if int(config['MIRROR']['CACHE']):
			cachefile = config['MIRROR']['CACHE_FILE']

			cache_thread = KThread(target=ftpretrievechunked, args=[ftp, filesrc, cachefile])
			cache_thread.start()

			globals()['mirror:threads']['cache'] = cache_thread
		else:
			ftpquit()

		if int(config['MIRROR']['STREAM']):
			streamurl = 'rtp://' + config['MIRROR']['STREAM_HOST'] + ':' + config['MIRROR']['STREAM_PORT']

			mirror['streamurl'] = streamurl

			stream_thread = KThread(target=stream, args=[srcurl, streamurl, cachefile])
			stream_thread.start()

			globals()['mirror:threads']['stream'] = stream_thread

	# ftpquit()

	return {'data': json.dumps(mirror).encode('utf-8'), 'headers': {'Content-Type': 'application/json'}}

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
	server_host = config['SERVER']['SERVER_HOST']
	server_port = int(config['SERVER']['SERVER_PORT'])
	server = server_class((server_host, server_port), handler_class)

	print('run()', 'serving at', config['SERVER']['SERVER_HOST'] + ':' + config['SERVER']['SERVER_PORT'])

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
