CREATE TABLE Users (
  UserID integer PRIMARY KEY AUTOINCREMENT,
  FirstName text,
  LastName text,
  Email varchar,
  PhoneNumber varchar,
  HashedPassword varchar
);

CREATE TABLE Inventory (
  ItemID integer PRIMARY KEY AUTOINCREMENT,
  UPC varchar,
  PartNumber varchar,
  ManufactererUPC varchar,
  Manufacterer varchar,
  Description text,
  Min integer,
  Max integer,
  Qty integer
);

CREATE TABLE Equipment (
  EquipmentID integer PRIMARY KEY AUTOINCREMENT,
  EquipmentName text,
  EquipmentManufacterer text
);

CREATE TABLE InventoryUsersLog (
  UserID integer,
  InventoryID integer,
  Time datetime
);




DROP TABLE IF EXISTS Users;

DROP TABLE IF EXISTS Inventory;

DROP TABLE IF EXISTS Equipment;

DROP TABLE IF EXISTS InventoryUsersLog;

