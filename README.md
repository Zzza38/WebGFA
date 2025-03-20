A games site made for my school. I own and operate this website independently, hoping for someone to help me. Because I don't want to leak all of the data when my school admins find this, no personal information that can help shut this website down is posted. This also helps you adopt it for yourself a lot easier. I'm currently working on converting this to be easily deployed with people outside of my school and without my help, but that isn't the case yet.

### Configuration
To configure your instance, run
```bash
npm run config
```
This site has the option to enable [Interstellar](https://github.com/UseInterstellar/Interstellar) and [WebSSH2](https://github.com/billchurch/webssh2) to run alongside it. 

### Server Deployment

```bash
npm i
npm run build
npm start
```

If you are hosting this locally, then PM2 is highly recommended. This ensures zero downtime and a config file is already provided.

To install and configure PM2, run
```bash
# Install and run pm2
npm install pm2 -g
pm2 start ecosystem.config.js

# Have pm2 run on startup
pm2 startup {YOUR STARTUP SYSTEM HERE (systemd, upstart, launchd, etc.)}
pm2 save
```
