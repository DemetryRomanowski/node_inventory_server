'use strict';

module.exports = {
    /**
     * The user object model
     */
    User : {
        user_id : null,
        first_name : "",
        last_name : "",
        email : "",
        phone_number : "",
        hashed_password : "",

        sanitize_phone_number : function()
        {
            // if(this.phone_number.contains(' ') || this.phone_number.contains('-'))
            this.phone_number = this.phone_number.replace('-', '').replace(' ', '');
        },
    },

    /**
     * The inventory object model
     */
    Inventory : {
        item_id : 0,
        upc : "",
        part_number : "",
        manufacterer_upc : "",
        description : "",
        min : 0,
        max : 0,
        qty : 0,

        /**
         * Set the inventory object
         *
         * @param {Number} item_id The item id in the database
         * @param {String} upc The upc of the item
         * @param {String} part_number The part number of the item
         * @param {String} manufacterer_upc The manufacterer upc of the item
         * @param {String} description The description of the item
         * @param {Number} min The minimum qty of the item
         * @param {Number} max The maximum qty of the item
         * @param {Number} qty The total qty of the item
         */ 
        set : function(item_id, upc, part_number, manufacterer_upc, description, min, max, qty)
        {
            this.item_id = item_id;
            this.upc = upc;
            this.part_number = part_number;
            this.manufacterer_upc = manufacterer_upc;
            this.description = description;
            this.min = min;
            this.max = max;
            this.qty = qty;
        }
        get : function()
        {
            return this;
        }
    }
};
