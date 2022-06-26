import { createRequire } from 'module'
import { readFile } from 'fs/promises'
const require = createRequire(import.meta.url);

const { Pool } = require('pg');

//const GET_PENDING_SQL = "SELECT * FROM operations WHERE state = 'pending' AND originator = $1 ORDER BY submitted_at ASC LIMIT $2"
const CHECKOUT_SQL =
	"WITH cte AS (SELECT id FROM peppermint.operations WHERE state='pending' AND originator=$1 ORDER BY id ASC LIMIT $2) UPDATE peppermint.operations AS op SET state = 'processing' FROM cte WHERE cte.id = op.id RETURNING *";
const SENT_SQL = "UPDATE peppermint.operations SET state = 'waiting', included_in = $1 WHERE id = ANY($2)"
const SET_STATE_SQL = "UPDATE peppermint.operations SET state = $1 WHERE id = ANY($2)"

export default function(db_connection) {
	let pool = new Pool(db_connection);

	const set_state = async function(ids, state) {
			return pool.query(SET_STATE_SQL, [ state, ids ]);
	};

	const checkout = async function(originator, limit) {
			let result = await pool.query(CHECKOUT_SQL, [originator, limit]);
			return result.rows;
	};

	const save_sent = function (ids, op_hash) {
		try {
			return pool.query(SENT_SQL, [op_hash, ids])
		} catch (err) {
			console.error(
				'Database error when writing hash to operations with ids:',
				ids, '\n', err
			)
		}
	}

	const save_confirmed = function (ids) {
		try {
			return set_state(ids, 'confirmed')
		} catch (err) {
			console.error(
				'Database error when saving confirmed status to operations with ids:',
				ids, '\n', err
			)
		}
	}

	const save_rejected = function (ids) {
		try {
			return set_state(ids, 'rejected')
		} catch (err) {
			console.error(
				'Database error when updating rejected operation with ids:',
				ids, '\n', err
			)
		}
	}

	const save_failed = function (ids) {
		try {
			return set_state(ids, 'failed')
		} catch (err) {
			console.error(
				'Database error when saving failed status to operations with ids:',
				ids, '\n', err
			)
		}
	}

	const save_unknown = function (ids) {
		try {
			return set_state(ids, 'unknown')
		} catch (err) {
			console.error(
				'Database error when updating unknown state operation with ids:',
				ids, '\n',	err
			)
		}
	}

	const ensure_db = async function () {
		const initSql = await readFile('./database/schema.sql')
		await pool.query(initSql.toString())
	}

	return {
			checkout,
			save_rejected,
			save_sent,
			save_confirmed,
			save_failed,
			save_unknown,
			ensure_db
	};
}