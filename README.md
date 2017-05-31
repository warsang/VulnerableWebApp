# Nodejs Express Mongodb pentest lab

This is the very first web application I worked on during an internship about three years ago.
I am a bit ashamed of myself when I look at it under a security perspective as it has a few vulnerabilities.
However, I thought the choice of technologies was very interesting as MEAN stack based applications are something you often see in the wild. Hence I decided I would clean up the code a little bit and begin a new project from this foundation. A MEAN stack pentest lab!!!

Now the base application would allow users to submit an image to an image processing algorithm and get it analyzed. However the algorithm is proprietary hence I could not just reuse it. So that part of the application is broken but I intend to fix it with something else (or ask if I can use the algorithm's code as I believe that it is no longer used).

Unfortunately there is no angularJS on the client side as at the time I thought Jquerry was cooler but I might use it one day.


# Run me!

There is a config.js file in the routes folder (don't ask me what it's doing there, I will move it eventually but have not got down to it yet). So I think you might want to:

* setup a gmail account and password in there
* Add a third sender email
* Go to [sweet captcha](http://sweetcaptcha.com/) and add the appKey and SecretKey (I don't recommend using sweetcaptcha on one of your apps. Maybe you can figure out why on this application ;)

Install packages by running from the same location as package.json:

```sh
$ sudo npm install
$ sudo npm install -g nodemon
```

And now run the app with:

```sh
$ nodemon
```

Now go to 127.0.0.1:3002 and have fun pentesting!

## Inquiries & contribution
Feel free to contact me at:

theodore.riera[@]gmail.com
warsang[@]hotmail.com

Or on freenode irc under the nick warsang

As this is the very early version, I have not tested much of the lab myself and would be interested in hearing from the vulnerabilities you find. Moreover, feel free to fork it and add some new vulnerabilities to the application! :)
