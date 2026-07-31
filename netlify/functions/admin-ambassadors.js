const { requireAdmin } = require('./lib/admin-auth');
const { getSupabase } = require('./lib/supabase');

// Scout: 5% of amount paid, Elite: 8% retroactive
const SCOUT_RATE = 0.05;
const ELITE_RATE = 0.08;
const ELITE_THRESHOLD = 25;

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function calcCommission(sales, tier) {
    const rate = tier === 'elite' ? ELITE_RATE : SCOUT_RATE;
    const totalPaid = sales.reduce((s, sale) => s + (sale.amount_paid_cents || 0), 0);
    return Math.round(totalPaid * rate);
}

exports.handler = async function(event) {
    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    if (event.httpMethod === 'GET') {
        const params = event.queryStringParameters || {};
        let query = supabase
            .from('ambassador_applications')
            .select('id, first_name, last_name, email, instagram_handle, city, why, how_heard, referral_code, discount_code, tier, status, tickets_sold, commission_earned_cents, notes, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (params.status && ['pending', 'approved', 'rejected'].includes(params.status)) {
            query = query.eq('status', params.status);
        }

        const { data, error } = await query;
        if (error) {
            console.error('admin ambassadors GET error:', error);
            return json(500, { error: 'Failed to load ambassadors.' });
        }

        const ambassadors = data || [];

        // Batch-fetch all sales for these ambassadors
        let salesByAmbassador = {};
        if (ambassadors.length) {
            const ids = ambassadors.map(a => a.id);
            const { data: allSales } = await supabase
                .from('ambassador_sales')
                .select('id, ambassador_id, discount_code, stripe_session_id, customer_name, customer_email, event_names, tickets_count, amount_paid_cents, amount_before_discount_cents, discount_amount_cents, purchased_at')
                .in('ambassador_id', ids)
                .order('purchased_at', { ascending: false });

            (allSales || []).forEach(sale => {
                if (!salesByAmbassador[sale.ambassador_id]) salesByAmbassador[sale.ambassador_id] = [];
                salesByAmbassador[sale.ambassador_id].push(sale);
            });
        }

        const result = ambassadors.map(a => {
            const sales = salesByAmbassador[a.id] || [];
            const ticketsSold = sales.reduce((s, sale) => s + (sale.tickets_count || 0), 0);
            const tier = ticketsSold >= ELITE_THRESHOLD ? 'elite' : 'scout';
            const commissionCents = calcCommission(sales, tier);
            const totalRevenueCents = sales.reduce((s, sale) => s + (sale.amount_paid_cents || 0), 0);
            const totalDiscountCents = sales.reduce((s, sale) => s + (sale.discount_amount_cents || 0), 0);
            return {
                ...a,
                tier,
                tickets_sold: ticketsSold,
                commission_earned_cents: commissionCents,
                total_revenue_cents: totalRevenueCents,
                total_discount_cents: totalDiscountCents,
                sales
            };
        });

        return json(200, { ambassadors: result });
    }

    if (event.httpMethod === 'POST') {
        let payload;
        try {
            payload = JSON.parse(event.body || '{}');
        } catch {
            return json(400, { error: 'Invalid request body.' });
        }

        const { id, action, discountCode, notes } = payload;

        if (!id)     return json(400, { error: 'id is required.' });
        if (!action) return json(400, { error: 'action is required.' });

        if (action === 'approve') {
            const { error } = await supabase
                .from('ambassador_applications')
                .update({
                    status: 'approved',
                    discount_code: discountCode ? discountCode.trim().toUpperCase() : null,
                    notes: notes || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) {
                console.error('ambassador approve error:', error);
                return json(500, { error: 'Failed to approve application.' });
            }
            return json(200, { ok: true });
        }

        if (action === 'reject') {
            const { error } = await supabase
                .from('ambassador_applications')
                .update({
                    status: 'rejected',
                    notes: notes || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) {
                console.error('ambassador reject error:', error);
                return json(500, { error: 'Failed to reject application.' });
            }
            return json(200, { ok: true });
        }

        // Manually add an offline sale (e.g. cash-at-door tracked manually)
        if (action === 'add_manual_sale') {
            const { eventName, ticketsCount, amountPaidCents, discountCode: code } = payload;
            if (!eventName) return json(400, { error: 'eventName is required.' });
            const count = parseInt(ticketsCount, 10) || 1;
            const amount = parseInt(amountPaidCents, 10) || 0;

            const { error } = await supabase
                .from('ambassador_sales')
                .insert({
                    ambassador_id: id,
                    discount_code: (code || 'MANUAL').toUpperCase(),
                    stripe_session_id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    event_names: eventName,
                    tickets_count: count,
                    amount_paid_cents: amount,
                    amount_before_discount_cents: amount,
                    discount_amount_cents: 0,
                    purchased_at: new Date().toISOString()
                });

            if (error) {
                console.error('ambassador add_manual_sale error:', error);
                return json(500, { error: 'Failed to add sale.' });
            }
            return json(200, { ok: true });
        }

        if (action === 'update_notes') {
            const { error } = await supabase
                .from('ambassador_applications')
                .update({ notes: notes || null, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) return json(500, { error: 'Failed to update notes.' });
            return json(200, { ok: true });
        }

        return json(400, { error: `Unknown action: ${action}` });
    }

    return json(405, { error: 'Method not allowed' });
};
