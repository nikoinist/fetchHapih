const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchPosts() {
    console.log('Starting fetchPosts function');

    try {
        const response = await fetch('https://www.hapih.hr/wp-json/wp/v2/posts?categories=12');
        if (!response.ok) {
            throw new Error(`Failed to fetch posts: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Fetched data successfully');

        for (const post of data) {
            const { id, date, title, content, excerpt } = post;

            // Clean HTML tags
            const cleanedContent = cleanHTML(content.rendered);
            const cleanedExcerpt = cleanHTML(excerpt.rendered);

            try {
                // Check for duplicates
                const { data: existingPost, error } = await supabase
                    .from('posts')
                    .select('id')
                    .eq('id', id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (!existingPost) {
                    // Insert new post
                    const { error: insertError } = await supabase
                        .from('posts')
                        .insert([
                            { id, date, title: title.rendered, content: cleanedContent, excerpt: cleanedExcerpt }
                        ]);

                    if (insertError) {
                        throw insertError;
                    }

                    console.log(`Inserted post with id ${id}`);
                } else {
                    console.log(`Post with id ${id} already exists`);
                }
            } catch (error) {
                console.error(`Error processing post with id ${id}:`, error.message);
            }
        }
    } catch (error) {
        console.error('Error fetching posts:', error.message);
    }

    console.log('Finished fetchPosts function');
}

function cleanHTML(html) {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || "";
}

// Run the function
fetchPosts().catch(console.error);

module.exports = fetchPosts;
