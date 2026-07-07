const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to scrape text from a URL
async function scrapeUrl(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        // Basic scraping: get title and all paragraph text
        const title = $('title').text();
        const paragraphs = $('p').map((i, el) => $(el).text()).get().join('\n');
        return `Title: ${title}\n\nContent:\n${paragraphs.substring(0, 5000)}`;
    } catch (error) {
        console.error('Scraping error:', error.message);
        return `Failed to scrape content from ${url}. (Error: ${error.message})`;
    }
}

// Mock AI Extraction Function (simulating processing scraped/pasted text)
async function extractInsights(type, content) {
    let processedContent = content;
    if (type === 'url') {
        processedContent = await scrapeUrl(content);
    }

    // In a real app, this would call Gemini/OpenAI with the processedContent
    // For this "working model", we'll generate structured posts using the scraped text
    const snippet = processedContent.substring(0, 200).replace(/\n/g, ' ');

    return {
        linkedin: `🚀 INSIGHTS FROM SOURCE:\n\n${snippet}...\n\nThis is a major shift in the industry. Most creators think about AI as a tool for generation, but the real power lies in the strategic repurposing of high-performing core ideas. #ContentStrategy #AI`,
        twitter: `🧵 1/ Just analyzed some fascinating content:\n\n"${snippet}..."\n\n2/ Key takeaway: Strategy > Generation.\n\n3/ Context is king. We need to stop copy-pasting and start repurposing with intent. #AI #Thread`,
        newsletter: `THE STRATEGIC REPURPOSING PLAYBOOK\n\nHi everyone,\n\nI recently came across some interesting insights:\n\n"${processedContent.substring(0, 500)}..."\n\nToday we are diving into how to turn these core ideas into a multi-channel engine...`
    };
}

app.post('/api/extract', async (req, res) => {
    const { type, content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        const insights = await extractInsights(type, content);
        const insightsStr = JSON.stringify(insights);

        db.run(
            'INSERT INTO sources (type, content, extracted_insights) VALUES (?, ?, ?)',
            [type, content, insightsStr],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ id: this.lastID, insights });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Extraction failed' });
    }
});

app.get('/api/source/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM sources WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Source not found' });
        }
        res.json({
            ...row,
            extracted_insights: JSON.parse(row.extracted_insights)
        });
    });
});

app.post('/api/posts', (req, res) => {
    const { source_id, platform, content, status } = req.body;
    db.run(
        'INSERT INTO posts (source_id, platform, content, status) VALUES (?, ?, ?, ?)',
        [source_id, platform, content, status || 'draft'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/posts', (req, res) => {
    db.all('SELECT posts.*, sources.type as source_type FROM posts LEFT JOIN sources ON posts.source_id = sources.id ORDER BY posts.created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
