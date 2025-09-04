-- Initialize user credits with welcome bonus
DO $$
DECLARE
    current_user_id uuid := auth.uid();
BEGIN
    -- Check if user already has credits record
    IF NOT EXISTS (SELECT 1 FROM public.user_credits WHERE user_id = current_user_id) THEN
        -- Create initial credit balance with 5 free credits
        INSERT INTO public.user_credits (
            user_id, 
            credits_balance, 
            free_credits,
            total_purchased,
            total_used
        ) VALUES (
            current_user_id, 
            5, -- 5 free credits
            5,
            0,
            0
        );
        
        -- Create initial transaction record
        INSERT INTO public.credit_transactions (
            user_id,
            transaction_type,
            credits_amount,
            credits_before,
            credits_after,
            description
        ) VALUES (
            current_user_id,
            'free',
            5,
            0,
            5,
            'Welcome bonus - 5 free credits activated'
        );
        
        -- Create or update free subscription record
        INSERT INTO public.user_subscriptions (
            user_id,
            plan_type,
            status,
            credits_per_month,
            monthly_price
        ) VALUES (
            current_user_id,
            'free',
            'active',
            5,
            0
        ) ON CONFLICT (user_id) DO NOTHING;
    ELSE
        -- User already has credits, just add 5 more as activation bonus
        PERFORM add_credits(current_user_id, 5, 'bonus', 'System credit activation bonus');
    END IF;
END $$;