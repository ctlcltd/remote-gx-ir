#!/usr/bin/env python3
#  remote-gx-ir/server.py
#  
#  @author Leonardo Laureti <https://loltgt.ga>
#  @version 2020-07-28
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


def command(uri):
	url = 'http://' + config['WEBIF']['HOST'] + '/' + uri

	print('command()', url)

	try:
		request = urllib.request.urlopen(url, timeout=2)
		mimetype = request.info()['Content-Type']
		data = request.read()
	except (urllib.error.HTTPError, urllib.error.URLError) as err:
		print('command()', 'urllib.error', err)

		return False

	return {'data': data, 'headers': {'Content-Type': mimetype}}

def chlist(uri):
	print('chlist()')

	ftp = FTP()
	ftpconnect = ftp.connect(host=config['WEBIF']['HOST'], port=int(config['WEBIF']['PORT']))
	ftplogin = ftp.login(user=config['WEBIF']['USER'], passwd=config['WEBIF']['PASS'])

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
	print('mirror()')

	ftp = FTP()
	ftpconnect = ftp.connect(host=config['WEBIF']['HOST'], port=21)
	ftplogin = ftp.login(user=config['WEBIF']['USER'], passwd=config['WEBIF']['PASS'])

	print('mirror()', 'ftp', ftp.getwelcome())

	url = b'';

	if ftpconnect.startswith('220') and ftplogin.startswith('230'):
		dircwd = '/../..' + config['DRIVE']['DISK'].rstrip('/')
		dirlist = ftp.nlst(dircwd)

		if dircwd + '/timeshift' in dirlist:
			dirlist = ftp.nlst(dircwd + '/timeshift')

			if dirlist:
				dirlist = ftp.nlst(dirlist[0])

				if dirlist:
					dirlist = ftp.nlst(dirlist[0])

					if dirlist:
						url = 'ftp://' + config['WEBIF']['USER'] + '@' + config['WEBIF']['HOST']
						url += str(dirlist[0])
						url = url.encode('utf-8')
	else:
		ftp.quit()

		print('mirror()', 'ftp error', ftpconnect, ftplogin)

		return False

	ftpquit = ftp.quit()

	print('mirror()', 'ftp', ftpquit)

	return {'data': url}

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
	server_address = (server_host, server_port)
	server = server_class(server_address, handler_class)

	print('run()', 'serving at', server_address)

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
