#!/usr/bin/env python3
#  remote-gx-ir/server.py
#  
#  @author Leonardo Laureti <https://loltgt.ga>
#  @version 2020-07-25
#  @license MIT License
#  

PORT = 8080
HOST = '192.168.1.2'
USER = 'user'
PASS = 'passwd'
DISK = '/tmp/UDx'
E2ROOT = '/home/gx/local/enigma_db'
E2DB = 'lamedb'
E2UB = 'userbouquet.1.tv'



# @link https://blog.anvileight.com/posts/simple-python-http-server/
# @link https://docs.python.org/3/library/ftplib.html

from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
from ftplib import FTP
from io import BytesIO
import os.path
import urllib.request
import json


def command(uri):
	url = 'http://' + HOST + '/' + uri

	print('command()', url)

	return urllib.request.urlopen(url, timeout=2).read()

def chlist(uri):
	print('chlist()')

	ftp = FTP()
	ftpconnect = ftp.connect(host=HOST, port=21)
	ftplogin = ftp.login(user=USER, passwd=PASS)

	print('chlist()', 'ftp', ftp.getwelcome())

	channel_list = {}

	if ftpconnect.startswith('220') and ftplogin.startswith('230'):
		dircwd = E2ROOT + '/' + E2DB
		reader = BytesIO()
		ftp.retrbinary('RETR ' + dircwd, reader.write)
		lamedb = reader.getvalue()

		dircwd = E2ROOT + '/' + E2UB
		reader = BytesIO()
		ftp.retrbinary('RETR ' + dircwd, reader.write)
		userbouquet = reader.getvalue()

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

	return json.dumps(channel_list).encode('utf-8')

def mirror(uri):
	print('mirror()')

	ftp = FTP()
	ftpconnect = ftp.connect(host=HOST, port=21)
	ftplogin = ftp.login(user=USER, passwd=PASS)

	print('mirror()', 'ftp', ftp.getwelcome())

	url = b'';

	if ftpconnect.startswith('220') and ftplogin.startswith('230'):
		dircwd = '/../..' + DISK.rstrip('/')
		dirlist = ftp.nlst(dircwd)

		if dircwd + '/timeshift' in dirlist:
			dirlist = ftp.nlst(dircwd + '/timeshift')

			if dirlist:
				dirlist = ftp.nlst(dirlist[0])

				if dirlist:
					dirlist = ftp.nlst(dirlist[0])

					if dirlist:
						url = 'ftp://' + USER + '@' + HOST
						url += str(dirlist[0])
						url = url.encode('utf-8')

	ftpquit = ftp.quit()

	print('mirror()', 'ftp', ftpquit)

	return url

class Handler(SimpleHTTPRequestHandler):
	def service(self):
		fn = self.path.split('/')[2];
		uri = os.path.relpath(self.path, '/service/' + fn)

		print('Handler', 'service()', fn)

		response = globals()[fn](uri)

		if response:
			self.send_response(200)
			self.end_headers()
			self.wfile.write(response)
		else:
			self.send_response(200)
			self.end_headers()
			self.wfile.write('error'.encode('utf-8'))

	def do_GET(self):
		if self.path.startswith('/service'):
			return self.service()

		return SimpleHTTPRequestHandler.do_GET(self)


def run(server_class=TCPServer, handler_class=Handler, port=PORT):
	server_address = ('', port)
	server = server_class(server_address, handler_class)

	print('run()', 'serving at port', PORT)

	try:
		server.serve_forever()
	except KeyboardInterrupt:
		pass

	server.server_close()

	print('run()', 'closing connection')

if __name__ == '__main__':
	run()
