-- 1. 检查是否存在测试用户
DO $$
DECLARE
    test_user_id integer;
BEGIN
    -- 查询测试用户ID
    SELECT id INTO test_user_id FROM users WHERE username = 'testuser';
    
    -- 如果用户不存在，创建测试用户
    IF test_user_id IS NULL THEN
        INSERT INTO users (username, password, fullname, role)
        VALUES ('testuser', '$2a$10$qxRO.fZzmLdQAvSJbt1fP.xHKZZJZjSx0zV5uVsD.oKhJL/DVDbfC', '测试用户', 'admin')
        RETURNING id INTO test_user_id;
        
        RAISE NOTICE '创建了新的测试用户，ID: %', test_user_id;
    ELSE
        RAISE NOTICE '测试用户已存在，ID: %', test_user_id;
    END IF;
    
    -- 2. 插入或更新会话记录
    INSERT INTO user_sessions (session_id, user_id, ip_address, is_valid, expires_at, data)
    VALUES (
        '079d628ee28fab2ba6a4455365b94413', -- 当前浏览器中的会话ID
        test_user_id,
        '127.0.0.1',
        TRUE,
        NOW() + INTERVAL '30 days',
        '{"authenticated": true, "role": "admin"}'::json
    )
    ON CONFLICT (session_id) 
    DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        is_valid = EXCLUDED.is_valid,
        expires_at = EXCLUDED.expires_at,
        data = EXCLUDED.data,
        last_activity = NOW();
        
    RAISE NOTICE '会话数据已更新';
END $$;