# remote-gx-ir

## Remote IR control (staging)

My remote controller web app for set-top-box based on csky-gx* Nationalchip boards and ?¿ comivision software.

|mirror|running|chlist|
|-|-|-|
|[![screen mirroring](../res/screen-mirroring.jpg)](https://raw.githubusercontent.com/ctlcltd/remote-gx-ir/res/screen-mirroring.jpg)|[![running from device](../res/running-from-device.jpg)](https://raw.githubusercontent.com/ctlcltd/remote-gx-ir/res/running-from-device.jpg)|[![channel list](../res/channel-list.jpg)](https://raw.githubusercontent.com/ctlcltd/remote-gx-ir/res/channel-list.jpg)|


Tested hard with an Edision Primo IP S2.

May works with other STBs untested: Octagon SX88, Golden Interstar Alpha, U2C Denys, Ineos ZX4 and STB with similar software.

> It requires *Python3*, web browser and optionally *ffmpeg* for local streaming. 


### Usage

- Install **python3**:

https://www.python.org/downloads/

- Cloning the repository into the device:

```git clone https://github.com/ctlcltd/remote-gx-ir.git```

- Edit **settings.ini**, file is divided by sections: *[SERVER]* web server Python3, *[WEBIF]* set-top-box web interface, *[FTP]* set-top-box FTP, *[E2]* set-top-box enigma2 database folder, *[DLNA]* set-top-box UPnP DLNA, *[MIRROR]* for screen mirroring.

- Then start the server and browse:

```python3 server.py```


### Roadmap

- DLNA UPnP
- VLC supports


## Contributing

You can open [issues!https://github.com/ctlcltd/remote-gx-ir/issues] to report bug, request features or send a [Pull Request!https://github.com/ctlcltd/remote-gx-ir/pulls].


## License

[MIT License](LICENSE).

