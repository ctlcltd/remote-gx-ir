#!/usr/bin/env python3
#  remote-gx-ir/server.py
#  
#  @author Leonardo Laureti <https://loltgt.ga>
#  @version 2020-07-29
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
import subprocess


def command(uri):
	print('command()', uri)

	url = 'http://' + config['WEBIF']['HOST'] + '/' + uri

	try:
		request = urllib.request.urlopen(url, timeout=2)
		mimetype = request.info()['Content-Type']
		data = request.read()
	except (urllib.error.HTTPError, urllib.error.URLError) as err:
		print('command()', 'urllib.error', err)

		return False

	return {'data': data, 'headers': {'Content-Type': mimetype}}

def chlist(uri):
	print('chlist()', uri)

	ftp = FTP()
	ftpconnect = ftp.connect(host=config['FTP']['HOST'], port=int(config['FTP']['PORT']))
	ftplogin = ftp.login(user=config['FTP']['USER'], passwd=config['FTP']['PASS'])

	print('chlist()', 'ftp', ftp.getwelcome())

	channel_list = {}

	if ftpconnect.startswith('220') and ftplogin.startswith('230'):
		dircwd = config['E2']['E2ROOT'] + '/' + config['E2']['E2DB']
		reader = BytesIO()
		ftp.retrbinary('RETR ' + dircwd, reader.write)
		lamedb = reader.getvalue()

		dircwd = config['E2']['E2ROOT'] + '/' + config['E2']['E2UB']
		reader = BytesIO()
		ftp.retrbinary('RETR ' + dircwd, reader.write)
		userbouquet = reader.getvalue()
	else:
		ftp.quit()

		print('chlist()', 'ftp error', ftpconnect, ftplogin)

		return False

	dlist = {}
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
				dlist[chid] = line
			elif count == 3:
				count = 0
				chid = ''

	dbouquet = []
	write = False

	for line in userbouquet.splitlines():
		line = line.decode('utf-8')

		if not write and line.startswith('#NAME'):
			write = True
			continue
		elif write and line.startswith('#SORT'):
			write = False
			continue

		if write:
			chid = line[9:-15].split(':')
			chid = chid[3] + ':' + chid[4] + ':' + chid[5] + ':' + chid[6]
			dbouquet.append(chid)

	index = 0;

	for chid in dbouquet:
		index += 1

		if chid in dlist:
			channel_list[chid] = {}
			channel_list[chid]['num'] = index
			channel_list[chid]['name'] = dlist[chid]

	ftpquit = ftp.quit()

	print('chlist()', 'ftp', ftpquit)

	return {'data': json.dumps(channel_list).encode('utf-8'), 'headers': {'Content-Type': 'application/json'}}

def mirror(uri):
	print('mirror()', uri)

	if int(config['MIRROR']['STREAM']) and 'stream' in globals():
		print('mirror()', 'streaming', 'kill()')

		globals()['stream'].kill()

	if uri == 'close':
		return {'data': b'OK'}

	ftp = FTP()
	ftpconnect = ftp.connect(host=config['FTP']['HOST'], port=int(config['FTP']['PORT']))
	ftplogin = ftp.login(user=config['FTP']['USER'], passwd=config['FTP']['PASS'])

	print('mirror()', 'ftp', ftp.getwelcome())

	mirror = {}

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
						srcurl = 'ftp://' + config['FTP']['USER'] + '@' + config['FTP']['HOST']
						srcurl += str(dirlist[0])
	else:
		ftp.quit()

		print('mirror()', 'ftp error', ftpconnect, ftplogin)

		return False

	ftpquit = ftp.quit()

	print('mirror()', 'ftp', ftpquit)

	mirror = {}

	if srcurl:
		mirror['srcurl'] = srcurl

		streamurl = 'rtp://' + config['MIRROR']['HOST'] + ':' + config['MIRROR']['PORT']

		mirror['streamurl'] = streamurl

		if int(config['MIRROR']['STREAM']) and subprocess.getstatusoutput('ffmpeg')[0]:
			time.sleep(int(config['MIRROR']['DELAY']))

			streampipe  = 'ffmpeg'
			streampipe += ' -re'
			streampipe += ' -ftp-password ' + config['FTP']['PASS']
			streampipe += ' -i ' + srcurl
			# streampipe += ' -sseof -99'
			streampipe += ' -vcodec copy'
			streampipe += ' -acodec copy'
			streampipe += ' -f rtp_mpegts ' + streamurl

			stream = subprocess.Popen(streampipe.split(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)

			if stream.stdout:
				print('mirror()', 'streaming at', config['MIRROR']['HOST'] + ':' + config['MIRROR']['PORT'])
	
				count = 0

				for line in stream.stdout:
					count += 1

					print(line)

					if count == 100:
						break

				mirror['streampid'] = stream.pid

				globals()['stream'] = stream
			else:
				print('mirror()', 'streaming failed')

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
