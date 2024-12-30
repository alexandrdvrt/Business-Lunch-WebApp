# Business-Lunch-WebApp

cd @project_path@/server

npm init -y

npm install express cors uuid dotenv

Run this script in your postgres db:  
CREATE TABLE IF NOT EXISTS dish_nomenclature (  
  nomenclature_id SERIAL PRIMARY KEY,  
  name VARCHAR(255) NOT NULL,  
  default_type VARCHAR(50) NOT NULL  
);  
  

CREATE TABLE IF NOT EXISTS variants (  
  variant_id VARCHAR(50) PRIMARY KEY,  
  day_and_number VARCHAR(255) NOT NULL  
);  
  

CREATE TABLE IF NOT EXISTS variant_dishes (  
  dish_id VARCHAR(50) PRIMARY KEY,  
  variant_id VARCHAR(50) NOT NULL,  
  name VARCHAR(255) NOT NULL,  
  type VARCHAR(50) NOT NULL,  
  dish_order INT NOT NULL,  
  CONSTRAINT fk_variant  
    FOREIGN KEY(variant_id)  
    REFERENCES variants(variant_id)  
    ON DELETE CASCADE  
);  
  
Then run:  
INSERT INTO dish_nomenclature (name, default_type)  
VALUES  
  ('Салат Оливье', 'салат'),  
  ('Салат Цезарь', 'салат'),  
  ('Суп Борщ', 'первое'),  
  ('Куриная отбивная', 'второе'),  
  ('Компот', 'напиток'),  
  ('Чай', 'напиток'),  
  ('Шоколадный пудинг', 'десерт');  
  
Then and .env into /server:  
DB_USER=postgres  
DB_HOST=localhost  
DB_NAME=@your db name@  
DB_PASSWORD=@your db password@  
DB_PORT=@your db port@  

When ready to launch in terminal write: node server.js  
If everything was done correctly, you should see message:"Server is running on http://localhost:5000" in the console.
