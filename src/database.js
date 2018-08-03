"use strict";

const sqlite3 = require('sqlite3').verbose();
const Debug = require('./debug');
const ErrorLevel = Debug.ErrorLevel;

const Models = require('./models/models');

const UserModel = Models.User;
const InventoryModel = Models.Inventory;

const db = new sqlite3.Database('./db/inventory.db');

module.exports = {

    /**
     * Checks if user exists in the database if it doesnt add user to the database
     * @param {UserModel} user_data The user data to add
     * @param {Function} onUserExists The callback if the user exists
     * @param {Function} onError The callback if there was an error
     */
    add_user : function(user_data, onUserExists = () => {}, onError = () => {})
    {
        db.serialize(() => {
            db.get("SELECT * FROM Users WHERE FirstName = (?) LIMIT 1", [user_data.first_name], (err, row) => {
                if(err) {
                    Debug.log(ErrorLevel.ERR, "Error: " + err.message);
                    onError(err);
                    return;
                }

                if(row) {
                    Debug.log(ErrorLevel.ERR, "Error user already exists!");
                    onUserExists(row);
                } else {
                    let stmt = db.prepare("INSERT INTO Users VALUES (?, ?, ?, ?, ?, ?)");

                    stmt.run([null, user_data.first_name, user_data.last_name, user_data.email, user_data.phone_number, user_data.hashed_password], (ret, err) => {
                        if (err) {
                            Debug.log(ErrorLevel.ERR, "Error adding user: " + err.message);
                            onError(err);
                        } else {
                            Debug.log(ErrorLevel.INFO, "Added new user");

                        }
                    });
                }
            });
        });
    },

    /**
     * Get a user from the database
     *
     * @param user_name The username to find
     * @param onUser The callback when a user is found
     * @param onError The callback when there is an error
     */
    get_user : function(user_name, onUser = () => {}, onError = () => {})
    {
        db.serialize(() => {
            db.get("SELECT * FROM Users WHERE FirstName = (?) LIMIT 1", user_name, (err, row) => {

                if(err) {
                    Debug.log(ErrorLevel.ERR, err.message);
                    onError(err);
                } else {
                    if(row) {
                        onUser(row);
                    } else {
                        onError(new Error("User does not exist"));
                    }
                }
            });
        });
    },

    /**
     * Edit a user in the data base, checks if user exists
     *
     * @param user_id The user ID to edit
     * @param user_data The data to change to
     * @param onError The callback if there was an error
     */
    edit_user : function(user_id, user_data, onError = () => {})
    {
        db.serialize(() => {
            db.get("SELECT * FROM Users WHERE UserID = (?) LIMIT 1", [user_id], (err, row) => {
                if(err) {
                    Debug.log(ErrorLevel.ERR, "Error: " + err.message);
                    onError(err);
                }
                if(row) {
                    let stmt = db.prepare("UPDATE Users SET FirstName = (?), LastName = (?), HashedPassword = (?) WHERE UserID = (?)");

                    stmt.run([user_data.first_name, user_data.last_name, user_data.password, user_id], (err) => {
                        if(err) {
                            Debug.log(ErrorLevel.ERR, "Error updating user: " + err.message);
                            onError(err);
                        } else {
                            Debug.log(ErrorLevel.INFO, "Edited user");
                        }
                    });
                } else {
                    Debug.log(ErrorLevel.ERR, "Error updating user: " + user_id + " : " + user_data.first_name + " User does not exist");
                    onError(new Error("Error updating user: " + user_id + " : " + user_data.first_name + " User does not exist"));
                }
            });
        });
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

    /**
     * Check if the item exists and if it doesn't add to database
     *
     * @param item_data The item data to add
     * @param onItemExists The callback if the item exists
     * @param onError The callback if the item exists
     */
    add_item : function(item_data, onItemExists = () => {}, onError = () => {})
    {
        db.serialize(() => {
            db.get("SELECT * FROM Inventory WHERE ItemID = (?) OR UPC = (?) OR PartNumber = (?) OR ManufactererUPC = (?)", [item_data.item_id, item_data.upc, item_data.part_number, item_data.manufacterer_upc], (err, row) => {
                if(err) {
                    Debug.log(ErrorLevel.ERR, "Error: " + err.message);
                    onError(err);
                    return;
                }

                if(row) {
                    Debug.log(ErrorLevel.WARN, "Warning item already exists!");
                    onItemExists(row);
                } else {
                    let stmt = db.prepare();

                    stmt.run([null, item_data.upc, item_data.part_number, item_data.manufacterer_upc, item_data.manufacterer, item_data.description, item_data.min, item_data.max, item_data.qty], (err) => {
                        if(err) {
                            Debug.log(ErrorLevel.ERR, "Error: " + err.message);
                            onError(err);
                        }
                    });
                }
            });
        });
    },

    /**
     * Get the item from the database
     *
     * @param item_id The id of the item to get
     * @param onComplete The callback if its complete
     * @param onError The callback if there was an error
     */
    get_item : function(item_id, onComplete = () => {}, onError = () => {})
    {
        db.serialize(() => {
            db.get("SELECT * FROM Inventory WHERE ItemID = (?)", [item_id], (row, err) => {
                if(err) {
                    Debug.log(ErrorLevel.ERR, err.message);
                    onError(err);
                    return;
                }
                if(row)
                    if(row.length > 1)
                        onError(new Error("What the fuck how did this happen?"));
                    else
                        onComplete(row);
                else
                    onError(new Error("Item does not exist"));
            });
        });
    },

    /**
     * Check if item exists and edit item in the database
     *
     * @param item_id The item id to edit
     * @param item_data The item data to change
     */
    edit_item : function(item_id, item_data)
    {

    },

    /**
     * Check if item exists and delete the item in the database
     *
     * @param item_id The item id to delete
     */
    delete_item : function(item_id)
    {

    },

    /**
     * Migrate the database
     *
     * @param migrate_data The data that is used during the migrate
     * @param onError The callback when an error occurs
     */
    migrate_db : function(migrate_data, onError)
    {
        db.serialize(() => {
            let stmt = db.prepare(migrate_data);

            stmt.run((err) => {
                if(err) {
                    Debug.log(ErrorLevel.ERR, "Error migrating db: " + err.message);
                    onError(err);
                }
            });
        });
    },

    /**
     * Seed the database with starter data
     *
     * @param seed_data The data to seed to the database
     * @param onError The callback if an error occurs
     */
    seed_db : function(seed_data, onError)
    {
        db.serialize(() => {
            let stmt = db.prepare(seed_data);

            stmt.run((err) => {
                if(err) {
                    Debug.log(ErrorLevel.ERR, "Error seeding db: " + err.message);
                    onError(err);
                }
            });
        });
    },

    /**
     * Close the database
     */
    close_database: function() {
        db.close();
    }
};