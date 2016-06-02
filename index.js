var path = require('path'),
    config = require('./config.js'),
    archiver = require('archiver'),
    moment = require('moment'),
    fs = require('fs'),
    target = path.resolve('./backup');

if (!config.file) {

    console.error('error: backup file path not defined');
    return;
}

var file = path.resolve(config.file);

try {

    fs.accessSync(file, fs.R_OK);
} catch (error) {

    console.error(error.stack);
    console.log('error: can not read file');
    return;
}

try {

    fs.accessSync(target, fs.R_OK);
} catch (error) {

    //create the target directory
    fs.mkdirSync(target);
}

const util = require('util');

var messages = {
    m_start: '',
    m_end: '',
    m_description: '',
    start: function () {

        if (this.m_start) return this.m_start;

        this.m_start = util.format('%s：backup started... \r\n', moment().format('YYYY-MM-DD HH:mm:ss'));

        return this.m_start;
    },
    end: function () {

        if (this.m_end) return this.m_end;

        this.m_end = util.format('%s：backup end... \r\n', moment().format('YYYY-MM-DD HH:mm:ss'));

        return this.m_end;
    },
    description: function (file) {

        if (this.m_description) return this.m_description;

        this.m_description = util.format('%s：file size: %d , last access time: %s , last modify time: %s , create time: %s \r\n',
            moment().format('YYYY-MM-DD HH:mm:ss'), file.size, file.last_access_time, file.last_modify_time, file.create_time);

        return this.m_description;
    }
};

console.log('server is running...');

//backup file
var backup = function (callback) {

    console.log(messages.start());

    var name = util.format('%s%s', moment().format('YYYY-MM-DD HH.mm.ss'), config.compress ? '.zip' : path.extname(file)),
        zip = archiver('zip'),
        path_target = path.join(target, name),
        read = fs.createReadStream(file),
        write = fs.createWriteStream(path_target);

    if (config.compress) {

        zip.pipe(write);

        zip.append(read, { name: util.format('file%s', path.extname(file)) });

        zip.finalize();

    } else {

        read.pipe(write);
    }

    read.on('error', function (err) {
        console.error(err.stack);
    });

    write.on('error', function (err) {
        console.error(err.stack);
    });

    write.on('close', function (err) {

        fs.stat(path_target, function (err, stats) {

            if (!!err) {

                console.error('read file infomation error: %s', err.stack);
                return;
            }

            //get the file info
            var info = {
                size: stats['size'],
                last_access_time: moment(stats['atime']).format('YYYY-MM-DD HH:mm:ss'),
                last_modify_time: moment(stats['mtime']).format('YYYY-MM-DD HH:mm:ss'),
                create_time: moment(stats['birthtime']).format('YYYY-MM-DD HH:mm:ss')
            };

            console.log(messages.end());
            console.log(messages.description(info))
            callback && callback.apply(null, [info]);
        });
    });
};

setInterval(function () {

    backup(function (file) {

        //send email TODO
        if (config.mail) { }
    });

}, config.time);