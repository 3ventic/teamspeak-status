var http = require('http');
var teamspeak = require('node-teamspeak');
var config = require('./config.js');

var port = config.port || 1337;

var status = {
    clients: 0,
    max_clients: 0,
    uptime: 0,
    channel_name: "",
    channels: []
};


http.createServer(function (req, res)
{
    res.writeHead(200, { 'Content-Type': 'application/json;charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(status));
}).listen(port);
console.log('Listening on port ' + port);


var tsclient = new teamspeak(config.address);
tsclient.send('login', {
    client_login_name: config.username,
    client_login_password: config.password
}, function (err, response)
{
    if (err)
    {
        console.log(err);
        return;
    }
    tsclient.send('use', { sid: config.virtualserverID }, function (err, response)
    {
        if (err)
        {
            console.log(err);
            return;
        }
        updateStatus();
        setInterval(updateStatus, 30000);
        
        tsclient.send('serverinfo', function (err, response)
        {
            if (err)
            {
                console.log(err);
                return;
            }
            status.channel_name = response.virtualserver_name;
            status.clients = response.virtualserver_clientsonline;
            status.max_clients = response.virtualserver_maxclients;
        });
    });
});

function updateStatus()
{
    tsclient.send('hostinfo', function (err, response)
    {
        if (err)
        {
            console.log(err);
            return;
        }
        //status.clients = response.virtualservers_total_clients_online;
        //status.max_clients = response.virtualservers_total_maxclients;
        status.uptime = response.instance_uptime;
    });
    tsclient.send('channellist', function (err, response)
    {
        if (err)
        {
            console.log(err);
            return;
        }
        
        var num_chans = response.length;
        var channels = [];
        
        function findParentAndAddChild(chans, child)
        {
            for (var i = 0; i < chans.length; ++i)
            {
                if (chans[i].cid === child.pid)
                {
                    chans[i].children.push(child);
                    chans[i].children[chans[i].children.length - 1].children = [];
                    return true;
                }
                else if (findParentAndAddChild(chans[i].children, child))
                {
                    return true;
                }
            }
            return false;
        }
        
        for (var i = 0; i < num_chans; ++i)
        {
            if (response[i].pid === 0)
            {
                channels.push(response[i]);
                channels[channels.length - 1].children = [];
            }
            else
            {
                findParentAndAddChild(channels, response[i]);
            }
        }
        
        tsclient.send('clientlist', function (err, response)
        {
            if (err)
            {
                console.log(err);
                return;
            }
            
            function addUsersToChannels(chans)
            {
                for (var i = 0; i < chans.length; ++i)
                {
                    chans[i].users = [];
                    for (var j = 0; j < response.length; ++j)
                    {
                        if (response[j].client_type === 0 && response[j].cid === chans[i].cid)
                        {
                            chans[i].users.push(response[j].client_nickname);
                        }
                    }
                    addUsersToChannels(chans[i].children);
                }
            }

            addUsersToChannels(channels);

            status.channels = channels;
        });
    });
}
