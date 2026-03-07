import { getDb } from '../src/lib/db';
import { runPdfPipeline } from '../src/lib/pdf-pipeline';
import fs from 'fs';
import path from 'path';

async function main() {
    const db = getDb();
    const orderId = 'test-example-order';
    const email = 'example@molty.marketing';
    const url = 'https://linear.app'; // good example product
    const tier = 'pro';

    console.log('Inserting test order into local database...');
    db.prepare(
        `INSERT OR IGNORE INTO pdf_orders (id, email, product_url, tier, status, intake_json)
     VALUES (?, ?, ?, ?, 'paid', ?)`
    ).run(
        orderId,
        email,
        url,
        tier,
        JSON.stringify({
            productDescription: "A purpose-built tool for planning and building products. Linear streamlines software projects, sprints, tasks, and bug tracking. It's built for high-performance teams.",
            targetAudience: "Product managers, engineers, and designers at fast-growing tech companies.",
            mainCompetitors: "Jira, Asana, Notion"
        })
    );

    db.prepare(`UPDATE pdf_orders SET status = 'paid' WHERE id = ?`).run(orderId);

    console.log('Running PDF pipeline...');
    try {
        const result = await runPdfPipeline(orderId);
        console.log('Pipeline Result:', result.status, result.lastError);
        if (result.status === 'done' && result.filePath) {
            const dest = path.resolve('PDFs/marketing-plan-bc209f6e.pdf');
            fs.copyFileSync(result.filePath, dest);
            console.log('Copied generated PDF to', dest);
        }
    } catch (err) {
        console.error('Pipeline failed:', err);
    }
}

main().catch(console.error);
