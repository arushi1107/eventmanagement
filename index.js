const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;
const fs = require('fs');
const unirest = require('unirest');
const nodemailer  = require('nodemailer');
const MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var url = "mongodb://localhost:27017/";
app.set('view-engine','ejs');
app.use(express.static(__dirname + '/public'));
app.use(
    bodyParser.urlencoded({extended : true})
);


var transporter = nodemailer.createTransport({
    service : 'gmail',
    auth : 
    {
        user : 'arushifalod11@gmail.com',
        pass : 'Arushi@1504'
    }
});

MongoClient.connect(url,{useUnifiedTopology : true},function(err,db)
{
    if(err) throw err;
    var dbo = db.db("arushi");
    app.get("/",function(req,res)
    {   
        dbo.collection("hosts").find({completed : false}).toArray(function(err,result)
        {
            if(err) throw err;
            console.log(result);
            res.render("index.ejs",{title : "Welcome",hosts : result});
        });
    });
    app.post("/host",function(req,res)
    {
        var details = req.body;
        var obj = {
            name : details.name,
            email : details.email,
            phone : details.phone,
            completed : false
        };
        dbo.collection("hosts").insertOne(obj,function(err,res)
        {
            if(err) throw err;
            console.log(res);
        });
        res.json(details);
    });
    app.post("/visitor",function(req,res)
    {
        var details = {
            name : req.body.name,
            email : req.body.email,
            phone : req.body.phone,
            hostid: req.body.hostid,
            entryTime : new Date().toISOString(),
            exitTime : null,
            completed : false
        };

        dbo.collection("visitors").insertOne(details,function(err,result)
        {
            if(err) throw err;
            var hostid = req.body.hostid;
            var email = "";
            var phone = "";
            var count=0;
            dbo.collection("hosts").find({completed : false}).toArray(function(err,result2)
            {
                if(err) throw err;
                for(var i=0;i<result2.length;i++)
                {
                    if(hostid == result2[i]._id)
                    {
                        phone = result2[i].phone;
                        email = result2[i].email;
                        count++;
                    }
                }
                if(count==0)
                {
                    res.send(" No host is there for the event");
                }
                else
                {
                    var mailOptions = {
                        from : 'arushifalod11@gmail.com',
                        to : email,
                        subject : 'You got a visitor',
                        html : '<h1> You got a visitor </h1><p>Name -'+details.name+' <br>Email - '+details.email+'<br>Phone - '+details.phone+'<br></p>'
                         

                    };
                    transporter.sendMail(mailOptions,function(err,info)
                    {
                        if(err) throw err;
                        var reqq = unirest("GET", "https://www.fast2sms.com/dev/bulk");
                        reqq.query({
                        "authorization": "OjzocFMNCn1YetJudx9hbaKk68wRWIAqmSflEPyVZ5BGr0LHiXpk4rfaTWLYqi1I8gFcXs2U5uERZ3CD",
                        "sender_id": "FSTSMS",
                        "message": 'You got a visitor\nName -'+details.name+' \nEmail - '+details.email+'\nPhone - '+details.phone+'\n',
                        "language": "english",
                        "route": "p",
                        "numbers": phone,
                        });

                        reqq.headers({
                        "cache-control": "no-cache"
                        });


                        reqq.end(function (rest) {
                        if (rest.error) throw new Error(rest.error);
                            console.log(rest.body);
                            res.json(details);
                        });
                    });
                }
            });
        });
    });
    app.get("/hosta",function(req,res)
    {
        dbo.collection("hosts").find({completed : false}).toArray(function(err,result)
        {
            if(err) throw err;
            console.log(result);
            res.render("admin.ejs",{title : "Enter hosts details",hosts :result });
        });
       
    });

    app.post('/complete',(req,res) => {
        var id = req.body.visitor;
        var hostid = req.body.id; 
        
        var newobj = 
        {
            $set : {
                completed : true,
                exitTime : new Date().toISOString(),
            }
        };
        var oldobj = {_id : ObjectID(hostid)};
        var oldobj1 = {_id : ObjectID(id)};
        dbo.collection('visitors').updateOne(oldobj1,newobj,(err,result) => {
            if(err) throw err;
            dbo.collection("visitors").findOne(oldobj1,function(err,result2)
            {
                if(err) throw err;
                dbo.collection("hosts").findOne(oldobj,function(err,result3)
                {
                    var e = result2.email;
                    var mailOptions = {
                        from : 'arushifalod11@gmail.com',
                        to : e,
                        subject : 'Details of the event',
                        html : "<h1>Details of visit</h1><p>Name - "+result2.name+"<br>Phone - "+result2.phone+"<br>Check in time - "+result2.entryTime+"<br>Check out time - "+result2.exitTime+"<br>Host Name - "+result3.name+"<br></p>"
                    };
                    transporter.sendMail(mailOptions,function(err,info)
                    {
                        if(err) throw err;
                        console.log(info);
                        res.json(details);
                    });
                    res.json(result2);
                });
                
            });
        });
    });

    app.post('/fetch/:hostid',(req,res) =>
    {
        var host  =req.params.hostid;
        dbo.collection("visitors").find({hostid : host,completed : false}).toArray(function(err,result)
        {
            if(err) throw err;
            console.log(result);
            res.json(result);
        });
    });

});

app.listen(port,function()
{
    console.log("app running on - "+port);
});