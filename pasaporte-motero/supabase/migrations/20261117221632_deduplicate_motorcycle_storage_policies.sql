-- Remove exact duplicate Storage policies for motorcycle files.
-- Keep one policy per operation with the same owner-folder predicate.
DROP POLICY IF EXISTS "Motorcycle owners delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Motorcycle photos delete own" ON storage.objects;
DROP POLICY IF EXISTS "Delete own motorcycle files" ON storage.objects;

DROP POLICY IF EXISTS "Motorcycle photos upload own" ON storage.objects;
DROP POLICY IF EXISTS "Motorcycle owners upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Upload own motorcycle files" ON storage.objects;

DROP POLICY IF EXISTS "Read own motorcycle files" ON storage.objects;
DROP POLICY IF EXISTS "Motorcycle owners read own files" ON storage.objects;
DROP POLICY IF EXISTS "Motorcycle photos read own" ON storage.objects;

DROP POLICY IF EXISTS "Motorcycle owners update own files" ON storage.objects;
