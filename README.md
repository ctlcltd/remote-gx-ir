# remote-gx-ir

## Remote IR control (staging)

Remote controller web app for set-top-box based on csky-gx6622-dvbs2 NationalChip boards and the same codebase.

|mirror|running|chlist|
|-|-|-|
|[![screen mirroring](../res/screen-mirroring.jpg)](https://raw.githubusercontent.com/ctlcltd/remote-gx-ir/res/screen-mirroring.jpg)|[![running from device](../res/running-from-device.jpg)](https://raw.githubusercontent.com/ctlcltd/remote-gx-ir/res/running-from-device.jpg)|[![channel list](../res/channel-list.jpg)](https://raw.githubusercontent.com/ctlcltd/remote-gx-ir/res/channel-list.jpg)|


Tested hard with an Edision Primo IP S2.

May works with other STBs untested: Octagon SX88, Golden Interstar Alpha X, U2C Denys H265, Ineos ZX4, Arnix Fiber IPTV, Echosat CA 610HD, Hiremco Turbo IPTV, Wegoo VOGUE One, Teac HDR2250T, Arrox SPIDER H.265, and STB with similar software.

> It requires *Python3*, web browser and optionally *ffmpeg* for local streaming. 

 

### Usage

- Install **python3**:

https://www.python.org/downloads/

- Cloning the repository into the device:

```git clone https://github.com/ctlcltd/remote-gx-ir.git```

- Edit **settings.ini**, file is divided by sections: *[SERVER]* web server Python3, *[WEBIF]* set-top-box web interface, *[FTP]* set-top-box FTP, *[E2]* set-top-box enigma2 database folder, *[DLNA]* set-top-box UPnP DLNA, *[MIRROR]* for screen mirroring.

- Then start the server and browse:

```python3 server.py```


## Caveats

Some tips with **settings.ini**:

###### *[MIRROR][CACHE_RETRY_DELAY]*
Time interval before a new attempt of download source file through FTP.

###### *[MIRROR][STREAM_START_DELAY]*
* Default:   3
* Recommanded in ios:   6

###### *[MIRROR][STREAM_BUFSIZE]*
Put higher values for hvec streams.

###### *[MIRROR][STREAM_LOOP]*
Loop from start when occuring errors in source stream.

* -1   infinite loop
* n   loop times (positive number)

###### *[MIRROR][STREAM_SEEK_EOF]*
Set the position in source stream from end of file.

* -n   seek from EOF (negative number)
* 0   disable seek


### Roadmap

- DLNA UPnP
- VLC support

 

## Contributing

You can open [issues](https://github.com/ctlcltd/remote-gx-ir/issues) to report bug, request features or send a [Pull Request](https://github.com/ctlcltd/remote-gx-ir/pulls).


## License

[MIT License](LICENSE).

