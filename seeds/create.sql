CREATE TABLE Users (
	UserID integer PRIMARY KEY AUTOINCREMENT,
	FirstName text,
	LastName text,
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

