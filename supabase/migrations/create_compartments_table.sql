-- compartments 테이블 생성
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS compartments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  crop VARCHAR(100),
  daily_records JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE compartments ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 데이터만 접근할 수 있도록 정책 설정
CREATE POLICY "Users can view own compartments" ON compartments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compartments" ON compartments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compartments" ON compartments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own compartments" ON compartments
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_compartments_updated_at
  BEFORE UPDATE ON compartments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
