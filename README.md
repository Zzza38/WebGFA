A games site made for my school. I own and operate this website independently, hoping for someone to help me. Because I don't want to leak all of the data when my school admins find this, no personal information that can help shut this website down is posted. This also helps you adopt it for yourself a lot easier. I'm currently working on converting this to be easily deployed with people outside of my school and without my help, but that isn't the case yet.

### Configuration
A config file is located at /config.json. Some options include being able to toggle [Interstellar](https://github.com/UseInterstellar/Interstellar) and [WebSSH2](https://github.com/billchurch/webssh2), editing the name of the site, the default color scheme, and others to come.
When you first run the site, whether it be in development mode or production, a data/database.json file will be copied from data/default-database.json. You do not need to edit the default database file. Once you go into the site, the default admin login is 'admin': 'admin'. CHANGE THESE IMMEDIATELY! If someone in your school find that your site is from this GitHub repo, and you didn't change the default admin login, your instance of the site is as good as cooked [congratulation](https://preview.redd.it/cm0gll38j2n71.jpg?auto=webp&s=47277546c81d45f43861ed2250915b43830bc7c7). Some things to note, you do not need to manually edit your database file. Everything will be available for the admin account(s) on the browser. 

If you wonder why there isn't a option to edit the guest account, it's because you don't need to and shouldn't. The defaults are fine for most people, and if you edit it and encounter an error I will just tell you to revert it to the default.

SOME OF THESE OPTIONS DON'T EXIST YET. THEY ARE THERE TO HELP ME REMEMBER TO PUT THEM IN LATER

### Server Deployment

```bash
npm i
npm run build
npm start
```
