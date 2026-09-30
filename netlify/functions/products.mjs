import { json } from './_db.mjs';
import { verifyAdmin, authFail } from './_admin.mjs';

function mapProduct(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    shortDescription: row.short_description || '',
    fullDescription: row.full_description || '',
    regularPrice: Number(row.regular_price || 0),
    salePrice: row.sale_price == null ? null : Number(row.sale_price),
    prices: row.prices || {},
    coverImage: row.cover_image || '♡',
    screenshots: row.screenshots || [],
    demoUrl: row.demo_url || '',
    downloadUrl: row.download_url || '',
    features: row.features || [],
    included: row.included || [],
    tags: row.tags || [],
    badge: row.badge || '',
    isFeatured: !!row.is_featured,
    isPopular: !!row.is_popular,
    isNew: !!row.is_new,
    isVisible: row.status === 'active',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime()
  };
}

async function supabase(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase environment variables are missing.');
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Supabase error ${response.status}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function handler(event) {
  try {
    const method = event.httpMethod || 'GET';

    // Public storefront: only active products
    if (method === 'GET') {
      const rows = await supabase(
        'products?select=*&status=eq.active&order=created_at.desc'
      );

      return json(200, rows.map(mapProduct));
    }

    // Everything below requires admin login
    if (!verifyAdmin(event)) return authFail();

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');

      const row = {
        title: body.title || '',
        slug: body.slug || '',
        category: body.category || '',
        short_description: body.shortDescription || '',
        full_description: body.fullDescription || '',
        regular_price: Number(body.regularPrice || 0),
        sale_price:
          body.salePrice == null || body.salePrice === ''
            ? null
            : Number(body.salePrice),
        prices: body.prices || {},
        cover_image: body.coverImage || '♡',
        screenshots: body.screenshots || [],
        demo_url: body.demoUrl || '',
        download_url: body.downloadUrl || '',
        features: body.features || [],
        included: body.included || [],
        tags: body.tags || [],
        badge: body.badge || '',
        is_featured: !!body.isFeatured,
        is_popular: !!body.isPopular,
        is_new: !!body.isNew,
        status: body.isVisible === false ? 'hidden' : 'active'
      };

      const rows = await supabase('products', {
        method: 'POST',
        headers: {
          Prefer: 'return=representation'
        },
        body: JSON.stringify(row)
      });

      return json(201, mapProduct(rows[0]));
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return json(400, { error: 'Product id is required.' });
      }

      const row = {
        title: body.title || '',
        slug: body.slug || '',
        category: body.category || '',
        short_description: body.shortDescription || '',
        full_description: body.fullDescription || '',
        regular_price: Number(body.regularPrice || 0),
        sale_price:
          body.salePrice == null || body.salePrice === ''
            ? null
            : Number(body.salePrice),
        prices: body.prices || {},
        cover_image: body.coverImage || '♡',
        screenshots: body.screenshots || [],
        demo_url: body.demoUrl || '',
        download_url: body.downloadUrl || '',
        features: body.features || [],
        included: body.included || [],
        tags: body.tags || [],
        badge: body.badge || '',
        is_featured: !!body.isFeatured,
        is_popular: !!body.isPopular,
        is_new: !!body.isNew,
        status: body.isVisible === false ? 'hidden' : 'active',
        updated_at: new Date().toISOString()
      };

      const rows = await supabase(
        `products?id=eq.${encodeURIComponent(body.id)}`,
        {
          method: 'PATCH',
          headers: {
            Prefer: 'return=representation'
          },
          body: JSON.stringify(row)
        }
      );

      if (!rows.length) {
        return json(404, { error: 'Product not found.' });
      }

      return json(200, mapProduct(rows[0]));
    }

    if (method === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (!body.id) {
        return json(400, { error: 'Product id is required.' });
      }

      await supabase(
        `products?id=eq.${encodeURIComponent(body.id)}`,
        { method: 'DELETE' }
      );

      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed.' });

  } catch (error) {
    console.error(error);
    return json(500, {
      error: 'Products backend error.'
    });
  }
}
