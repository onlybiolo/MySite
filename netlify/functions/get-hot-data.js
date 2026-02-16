const { Client } = require('pg');

exports.handler = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Prendi i 3 tool più usati
        const res = await client.query('SELECT tool_id, tool_name, usage_count FROM tool_usage ORDER BY usage_count DESC LIMIT 3');

        const trending = res.rows.map((row, index) => ({
            id: index + 1,
            title: row.tool_name,
            url: row.tool_id.includes('blogs') ? `${row.tool_id}` : `tools/${row.tool_id}.html`,
            description: `Usato ${row.usage_count} volte dalla community Btoolsify.`,
            statText: "Trend in crescita",
            statIcon: "fas fa-chart-line",
            icon: row.tool_id.includes('pdf') ? 'fas fa-file-pdf' : 'fas fa-tools'
        }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trending }),
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: "Error fetching data" };
    } finally {
        await client.end();
    }
};
