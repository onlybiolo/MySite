const { Client } = require('pg');

exports.handler = async (event) => {
    // Solo POST consentito
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { toolId, toolName } = JSON.parse(event.body);
    if (!toolId || !toolName) {
        return { statusCode: 400, body: "Missing toolId or toolName" };
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const query = `
      INSERT INTO tool_usage (tool_id, tool_name, usage_count, last_updated)
      VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (tool_id) 
      DO UPDATE SET usage_count = tool_usage.usage_count + 1, last_updated = CURRENT_TIMESTAMP;
    `;
        await client.query(query, [toolId, toolName]);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Usage tracked successfully" }),
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: "Internal Server Error" };
    } finally {
        await client.end();
    }
};
