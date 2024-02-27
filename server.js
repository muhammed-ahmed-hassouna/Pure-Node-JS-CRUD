const http = require('http');
const url = require('url');
const { Pool } = require('pg');

const db = new Pool({
    user: process.env.USER,
    password: process.env.PASSWORD,
    host: process.env.HOST,
    port: process.env.PORT,
    database: process.env.DATABASE
});

const server = http.createServer(async (req, res) => {
    let { query, pathname: path } = url.parse(req.url, true);
    let method = req.method;
    switch (method) {
        case 'GET':
            if (path.toLowerCase() === '/getitems') {
                await GetItems(res);
            }
            break;
        case 'POST':
            if (path.toLowerCase() === '/createitem') {
                await CreateItem(req, res);
            }
            break;
        case 'PUT' || 'PATCH':
            if (path.toLowerCase() === '/updateitem') {
                await UpdateItem(req, res, query);
            }
            break;
        case 'DELETE':
            if (path.toLowerCase() === '/deleteitem') {
                await DeleteItem(req, res, query);
            }
            break;
        default:
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');

    }
});

const accumulateData = (req) => {
    return new Promise((resolve, reject) => {
        let data = '';

        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                resolve(parsedData);
            } catch (error) {
                reject(error);
            }
        });

        req.on('error', (error) => {
            reject(error);
        });
    });
};

async function GetItems(res) {
    try {
        const query = await db.query('SELECT * FROM items');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(`Successful !` + JSON.stringify(query.rows));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

async function CreateItem(req, res) {
    try {
        const requestData = await accumulateData(req);

        const { name, description } = requestData;
        const values = [name, description];

        const queryText = 'INSERT INTO items (name, description) VALUES ($1, $2)';
        const result = await db.query(queryText, values);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(`Successful !` + JSON.stringify(result.rows));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

async function UpdateItem(req, res, query) {
    try {
        const requestData = await accumulateData(req);
        const { id } = query;
        const { name, description } = requestData;
        const values = [name, description, id];

        const queryText = 'UPDATE items SET name = $1, description = $2 WHERE item_id = $3 RETURNING *';
        const result = await db.query(queryText, values);

        if (result.rows.length === 0) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`Item with ID ${id} not found`);
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(`Successful !` + JSON.stringify(result.rows));
        }
    } catch (error) {
        console.log(error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

async function DeleteItem(req, res, query) {
    try {
        const { id } = query;
        const values = [id];

        const queryText = 'DELETE FROM items WHERE item_id = $1 RETURNING *';
        const result = await db.query(queryText, values);

        if (result.rows.length === 0) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Item not found');
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify('Delete successful!', result.rows));
        }
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}


server.listen(8000, () => {
    console.log(`Server is running on http://localhost:8000`);
});
