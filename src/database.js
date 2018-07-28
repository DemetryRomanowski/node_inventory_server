"use strict";

const sqlite3 = require('sqlite3').verbose();
const Debug = require('./debug');
const ErrorLevel = Debug.ErrorLevel;

const db = new sqlite3.Database('./db/inventory.db');

module.exports = {
    /**
     * Add a user to the database
     * @param user_data The user data to add
     */
    add_user : function(user_data)
    {
        try {
            db.serialize(() => {
                let stmt = db.prepare("INSERT INTO Users VALUES (?, ?, ?, ?)");

                stmt.run([null, user_data.first_name, user_data.last_name, user_data.password], (err) => {
                    if(err)
                        Debug.log(ErrorLevel.ERR, "Error adding user: " + err.message);

                });
            });

            db.close();
        }
        catch(err)
        {
            Debug.log(ErrorLevel.ERR, "Error adding user: " + err.message);
        }
    },

    /**
     * Edit a users data in the database
     *
     * @param user_id The user ID to edit
     * @param user_data The data to change to
     */
    edit_user : function(user_id, user_data)
    {
        db.serialize(() => {
            let stmt = db.prepare("UPDATE Users SET UserID  = (?), FirstName = (?), LastName = (?), HashedPassword = (?) WHERE UserID = (?)");

            stmt.run([user_id, user_data.first_name, user_data.last_name, user_data.password, user_id], (err) => {
                Debug.log(ErrorLevel.ERR, "Error updating user: " + err.message);
            });
        });

        db.close();
    },

    /**
     * Delete a user from the database
     * @param user_id The user ID to delete
     */
    delete_user : function(user_id)
    {
        db.serialize(() => {
            let stmt = db.prepare("DELETE FROM Users WHERE UserID = (?)");

            stmt.run([user_id], (err) => {
                Debug.log(ErrorLevel.ERR, "Error deleting user: " + err.message);
            });

        });

        db.close();
    },

    add_item : function(item_data)
    {

    },

    edit_item : function(item_id, item_data)
    {

    },

    delete_item : function(item_id)
    {

    },

    /**
     * Migrate the database
     *
     * @param migrate_data The data that is used during the migrate
     */
    migrate_db : function(migrate_data)
    {
        db.serialize(() => {
            let stmt = db.prepare(migrate_data);

            stmt.run((err) => {
                Debug.log(ErrorLevel.ERR, "Error migrating db: " + err.message);
            });
        });

        db.close();
    },

    seed_db : function()
    {

    }
};

//     delete_user : function(user_id)
//     {
//         db.serialize(() => {
//             let stmt = db.prepare("DELETE FROM Users WHERE Id == (?)");
//
//             stmt.run(user_id);
//         });
//
//         db.close();
//     },
//
//     add_item : function(item_data) {
//
//     },
//
//     edit_item : function(item_id, item_data)
//     {
//
//     },
//
//     delete_item : function(item_id)
//     {
//
//     },
//
//     seed : function(seed_data)
//     {
//         db.serialize(() => {
//             db.run(seed_data);
//         });
//
//         db.close();
//     },
//
//     migrate : function(migrate_data)
//     {
//         db.serialize(() => {
//             db.run(migrate_data)
//         });
//
//         db.close();
//     }
// };


// var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
//     for (var i = 0; i < 10; i++) {
//         stmt.run("Ipsum " + i);
//     }
//     stmt.finalize();
//
//     db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
//         console.log(row.id + ": " + row.info);
//     });
