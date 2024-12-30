require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

function generateVariantId() {
  return 'BL-' + Date.now();
}

function generateDishId() {
  return 'D-' + Date.now();
}

function getDishOrderByType(type) {
  const map = {
    'салат': 1,
    'первое': 2,
    'второе': 3,
    'напиток': 4,
    'десерт': 5
  };
  return map[type] || 999;
}

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, 
  port: process.env.DB_PORT,
});

app.get('/nomenclature', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT nomenclature_id, name, default_type
      FROM dish_nomenclature
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /nomenclature:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/nomenclature', async (req, res) => {
  const { name, default_type } = req.body;
  if (!name || !default_type) {
    return res.status(400).json({ error: 'name and default_type are required' });
  }
  try {
    const insert = await pool.query(`
      INSERT INTO dish_nomenclature (name, default_type)
      VALUES ($1, $2)
      RETURNING nomenclature_id, name, default_type
    `, [name, default_type]);
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('POST /nomenclature:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/variants', async (req, res) => {
  try {
    const variantsResult = await pool.query(`
      SELECT variant_id, day_and_number
      FROM variants
      ORDER BY variant_id
    `);
    const variantsRows = variantsResult.rows;

    const dishesResult = await pool.query(`
      SELECT dish_id, variant_id, name, type, dish_order
      FROM variant_dishes
      ORDER BY dish_order
    `);
    const dishesRows = dishesResult.rows;

    const variants = variantsRows.map((v) => {
      const variantDishes = dishesRows.filter(d => d.variant_id === v.variant_id);
      return {
        id: v.variant_id,
        day_and_number: v.day_and_number,
        dishes: variantDishes.map(d => ({
          id: d.dish_id,
          name: d.name,
          type: d.type
        }))
      };
    });
    res.json(variants);
  } catch (err) {
    console.error('GET /variants:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/variants', async (req, res) => {
  const { day_and_number } = req.body;
  if (!day_and_number) {
    return res.status(400).json({ error: 'day_and_number is required' });
  }
  const newVariantId = generateVariantId();

  try {
    await pool.query(`
      INSERT INTO variants (variant_id, day_and_number)
      VALUES ($1, $2)
    `, [newVariantId, day_and_number]);

    res.status(201).json({
      id: newVariantId,
      day_and_number,
      dishes: []
    });
  } catch (err) {
    console.error('POST /variants:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/variants/:id', async (req, res) => {
  const { id } = req.params; 
  const { day_and_number } = req.body;
  if (!day_and_number) {
    return res.status(400).json({ error: 'day_and_number is required' });
  }

  try {
    const updateRes = await pool.query(`
      UPDATE variants
      SET day_and_number = $2
      WHERE variant_id = $1
      RETURNING variant_id, day_and_number
    `, [id, day_and_number]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    const updated = updateRes.rows[0];

    const dishRes = await pool.query(`
      SELECT dish_id, name, type, dish_order
      FROM variant_dishes
      WHERE variant_id = $1
      ORDER BY dish_order
    `, [id]);
    const dishes = dishRes.rows.map(d => ({
      id: d.dish_id, name: d.name, type: d.type
    }));

    res.json({
      id: updated.variant_id,
      day_and_number: updated.day_and_number,
      dishes
    });
  } catch (err) {
    console.error('PUT /variants/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/variants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const del = await pool.query(`
      DELETE FROM variants
      WHERE variant_id = $1
      RETURNING variant_id
    `, [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.status(204).end();
  } catch (err) {
    console.error('DELETE /variants/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/variants/:variantId/dishes', async (req, res) => {
  const { variantId } = req.params;
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  const newDishId = generateDishId();
  const dishOrder = getDishOrderByType(type);

  try {
    const varCheck = await pool.query(`
      SELECT variant_id, day_and_number FROM variants WHERE variant_id=$1
    `, [variantId]);
    if (varCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const dishCheck = await pool.query(`
      SELECT dish_id FROM variant_dishes
      WHERE variant_id=$1 AND type=$2
    `, [variantId, type]);
    if (dishCheck.rowCount > 0) {
      return res.status(400).json({
        error: `Dish with type '${type}' already exists in this variant`
      });
    }

    await pool.query(`
      INSERT INTO variant_dishes (dish_id, variant_id, name, type, dish_order)
      VALUES ($1, $2, $3, $4, $5)
    `, [newDishId, variantId, name, type, dishOrder]);

    const variantRow = varCheck.rows[0];
    const allDishes = await pool.query(`
      SELECT dish_id, name, type, dish_order
      FROM variant_dishes
      WHERE variant_id=$1
      ORDER BY dish_order
    `, [variantId]);

    res.status(201).json({
      id: variantRow.variant_id,
      day_and_number: variantRow.day_and_number,
      dishes: allDishes.rows.map(d => ({
        id: d.dish_id,
        name: d.name,
        type: d.type
      }))
    });
  } catch (err) {
    console.error('POST /variants/:variantId/dishes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/variants/:variantId/dishes/:dishId', async (req, res) => {
  const { variantId, dishId } = req.params;
  try {
    const del = await pool.query(`
      DELETE FROM variant_dishes
      WHERE dish_id = $1
        AND variant_id = $2
      RETURNING dish_id
    `, [dishId, variantId]);
    if (del.rowCount === 0) {
      return res.status(404).json({ error: 'Dish not found or does not belong to this variant' });
    }

    const varCheck = await pool.query(`
      SELECT variant_id, day_and_number
      FROM variants
      WHERE variant_id = $1
    `, [variantId]);
    if (varCheck.rowCount === 0) {
      return res.status(200).json({ message: 'Variant removed, dish removed' });
    }

    const variantRow = varCheck.rows[0];
    const allDishes = await pool.query(`
      SELECT dish_id, name, type, dish_order
      FROM variant_dishes
      WHERE variant_id = $1
      ORDER BY dish_order
    `, [variantId]);

    res.json({
      id: variantRow.variant_id,
      day_and_number: variantRow.day_and_number,
      dishes: allDishes.rows.map(d => ({
        id: d.dish_id,
        name: d.name,
        type: d.type
      }))
    });
  } catch (err) {
    console.error('DELETE /variants/:variantId/dishes/:dishId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.patch('/variants/:fromVariantId/dishes/:dishId/transfer', async (req, res) => {
  const { fromVariantId, dishId } = req.params;
  const toVariantId = req.query.toVariantId || req.body.toVariantId;
  if (!toVariantId) {
    return res.status(400).json({ error: 'toVariantId is required' });
  }

  try {
    const dishCheck = await pool.query(`
      SELECT dish_id, variant_id, name, type
      FROM variant_dishes
      WHERE dish_id=$1 AND variant_id=$2
    `, [dishId, fromVariantId]);
    if (dishCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Dish not found in source variant' });
    }
    const dishRow = dishCheck.rows[0];

    const toVarCheck = await pool.query(`
      SELECT variant_id FROM variants WHERE variant_id=$1
    `, [toVariantId]);
    if (toVarCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Target variant not found' });
    }

    const typeCheck = await pool.query(`
      SELECT dish_id
      FROM variant_dishes
      WHERE variant_id=$1 AND type=$2
    `, [toVariantId, dishRow.type]);
    if (typeCheck.rowCount > 0) {
      return res.status(400).json({
        error: `Dish with type '${dishRow.type}' already exists in target variant`
      });
    }

    const newOrder = getDishOrderByType(dishRow.type);
    await pool.query(`
      UPDATE variant_dishes
      SET variant_id=$1,
          dish_order=$2
      WHERE dish_id=$3
    `, [toVariantId, newOrder, dishId]);

    const sourceVariantRes = await pool.query(`
      SELECT variant_id, day_and_number
      FROM variants
      WHERE variant_id=$1
    `, [fromVariantId]);
    let sourceVariant = null;
    if (sourceVariantRes.rowCount > 0) {
      const sv = sourceVariantRes.rows[0];
      const svDishes = await pool.query(`
        SELECT dish_id, name, type, dish_order
        FROM variant_dishes
        WHERE variant_id=$1
        ORDER BY dish_order
      `, [fromVariantId]);
      sourceVariant = {
        id: sv.variant_id,
        day_and_number: sv.day_and_number,
        dishes: svDishes.rows.map(d => ({
          id: d.dish_id, name: d.name, type: d.type
        }))
      };
    }

    const targetVariantRes = await pool.query(`
      SELECT variant_id, day_and_number
      FROM variants
      WHERE variant_id=$1
    `, [toVariantId]);
    const tv = targetVariantRes.rows[0];
    const tvDishes = await pool.query(`
      SELECT dish_id, name, type, dish_order
      FROM variant_dishes
      WHERE variant_id=$1
      ORDER BY dish_order
    `, [toVariantId]);
    const targetVariant = {
      id: tv.variant_id,
      day_and_number: tv.day_and_number,
      dishes: tvDishes.rows.map(d => ({
        id: d.dish_id, name: d.name, type: d.type
      }))
    };

    res.json({
      message: 'Dish transferred successfully',
      sourceVariant,
      targetVariant
    });
  } catch (err) {
    console.error('PATCH /variants/:fromVariantId/dishes/:dishId/transfer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
