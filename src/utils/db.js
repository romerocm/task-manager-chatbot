// src/utils/db.js
import pkg from "pg";
const { Pool } = pkg;

// Create a new pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Additional pool configuration
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
});

// The pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Query wrapper with error handling
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error("Error executing query", { text, error: err.message });
    throw err;
  }
};

// Transaction wrapper
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Utility function to handle pagination
export const paginate = async (text, params, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const countQuery = `SELECT COUNT(*) FROM (${text}) AS count`;
  const paginatedQuery = `${text} LIMIT $${params.length + 1} OFFSET $${
    params.length + 2
  }`;

  try {
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params),
      pool.query(paginatedQuery, [...params, limit, offset]),
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  } catch (err) {
    console.error("Error in pagination", err);
    throw err;
  }
};

// Helper function to build WHERE clauses
export const buildWhereClause = (filters) => {
  const conditions = [];
  const values = [];
  let paramCount = 1;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      conditions.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  });

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

// Example usage:
// Regular query
// const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction
// await transaction(async (client) => {
//   await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);
//   await client.query('INSERT INTO transactions (user_id, amount) VALUES ($1, $2)', [userId, amount]);
// });

// Pagination
// const result = await paginate('SELECT * FROM users', [], 1, 10);

// Where clause builder
// const { whereClause, values } = buildWhereClause({ status: 'active', role: 'admin' });
// const users = await query(`SELECT * FROM users ${whereClause}`, values);

export default {
  query,
  transaction,
  paginate,
  buildWhereClause,
  pool,
};
