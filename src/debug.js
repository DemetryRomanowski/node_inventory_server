"use strict";

const fs = require('fs');

//#region Private
var log_set = false;
var log_file = "log.txt";

const Colors = {
    Reset : "\x1b[0m",
    Bright : "\x1b[1m",
    Dim : "\x1b[2m",
    Underscore : "\x1b[4m",
    Blink : "\x1b[5m",
    Reverse : "\x1b[7m",
    Hidden : "\x1b[8m",
    FgBlack : "\x1b[30m",
    FgRed : "\x1b[31m",
    FgGreen : "\x1b[32m",
    FgYellow : "\x1b[33m",
    FgBlue : "\x1b[34m",
    FgMagenta : "\x1b[35m",
    FgCyan : "\x1b[36m",
    FgWhite : "\x1b[37m",
    BgBlack : "\x1b[40m",
    BgRed : "\x1b[41m",
    BgGreen : "\x1b[42m",
    BgYellow : "\x1b[43m",
    BgBlue : "\x1b[44m",
    BgMagenta : "\x1b[45m",
    BgCyan : "\x1b[46m",
    BgWhite : "\x1b[47m",
    Empty : ""
};


function append_data(file, data, onComplete, onError)
{
    fs.appendFile(file, data, (err) => {
        if(err)
        {
            if(onError)
                onError(err);
        }
        else
        {
            if(onComplete)
                onComplete();
        }
    });
}
//#endregion

//#region Public
module.exports = {

    ErrorLevel : {
        DEBUG : {
            data: "DEBUG: ",
            fg_color: Colors.FgCyan,
            bg_color: Colors.Empty
        },
        INFO : {
            data: "INFO: ",
            fg_color: Colors.FgGreen,
            bg_color: Colors.Empty
        },
        WARN : {
            data: "WARNING: ",
            fg_color: Colors.FgYellow,
            bg_color: Colors.Empty
        },
        ERR : {
            data: "ERROR: ",
            fg_color: Colors.FgRed,
            bg_color: Colors.Bright
        }
    },

    /**
     * Set a setting for the logger
     * @param setting The setting to set
     * @param value The value to set the setting to
     */
    set : function(setting, value)
    {
        switch(setting)
        {
            case "log": log_set = value;
                break;
            case "logfile": log_file = value;
                break;
            default: {
                this.log(this.ErrorLevel.ERR, "Setting value not recognized.");
            }
        }
    },

    /**
     * Log data to console and file
     * @param err_level The error level to display
     * @param string The string to display
     */
    log : function(err_level, string) {
        if(err_level === undefined)
            throw "ERROR LEVEL IS UNDEFINED";

        if(log_set === true)
            append_data(log_file, new Date(Date.now()).toLocaleString() + " : " + err_level.data + string + '\n', null, (err) => {
                console.log(
                    ErrorLevel.ERR.fg_color + ErrorLevel.ERR.bg_color + '%s' + Colors.Reset,
                    new Date(Date.now()).toLocaleString() + " : LOG ERROR: " + err.message
                );
            });

        //Print the log to the console
        console.log(err_level.fg_color + err_level.bg_color + '%s' + Colors.Reset, new Date(Date.now()).toLocaleString() + " : " + err_level.data + string.toString());
    }
};
//#endregion