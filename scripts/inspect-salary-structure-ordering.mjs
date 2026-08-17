import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSalaryOrdering() {
  console.log('--- TEST SALARY STRUCTURE ORDERING ---');

  // 1. Create a dummy faculty member for testing
  const { data: fac, error: facErr } = await supabase
    .from('faculty')
    .insert({
      name: 'Test Faculty Order',
      phone: '9998887776',
      active: true
    })
    .select()
    .single();

  if (facErr) {
    console.error('Faculty Insert Error:', facErr);
    return;
  }
  console.log('Created test faculty:', fac.id);

  try {
    // 2. Insert Structure 1
    const { data: s1, error: err1 } = await supabase
      .from('faculty_salary_structures')
      .insert({
        faculty_id: fac.id,
        basic: 50000,
        hra: 20000,
        other_allowances: 10000,
        pf_deduction: 3000,
        pt_deduction: 200,
        tds_deduction: 5000,
        effective_from: '2026-07-13'
      })
      .select()
      .single();
    console.log('Inserted Structure 1 (2026-07-13, basic=50000):', s1?.id);

    // Query latest using EXISTING UI query logic
    const { data: q1 } = await supabase
      .from('faculty_salary_structures')
      .select('*')
      .eq('faculty_id', fac.id)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    console.log('UI Query 1 Result Basic Pay:', q1?.basic, 'Effective From:', q1?.effective_from);

    // 3. Insert Structure 2 (2026-07-20, basic=55000)
    const { data: s2, error: err2 } = await supabase
      .from('faculty_salary_structures')
      .insert({
        faculty_id: fac.id,
        basic: 55000,
        hra: 5000,
        other_allowances: 2000,
        pf_deduction: 3500,
        pt_deduction: 200,
        tds_deduction: 6000,
        effective_from: '2026-07-20'
      })
      .select()
      .single();
    console.log('Inserted Structure 2 (2026-07-20, basic=55000):', s2?.id);

    // Query latest using EXISTING UI query logic
    const { data: q2 } = await supabase
      .from('faculty_salary_structures')
      .select('*')
      .eq('faculty_id', fac.id)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    console.log('UI Query 2 Result Basic Pay:', q2?.basic, 'Effective From:', q2?.effective_from);

    // 4. Insert Structure 3 (Update with SAME effective_from date 2026-07-20, basic=60000)
    const { data: s3, error: err3 } = await supabase
      .from('faculty_salary_structures')
      .insert({
        faculty_id: fac.id,
        basic: 60000,
        hra: 6000,
        other_allowances: 3000,
        pf_deduction: 4000,
        pt_deduction: 200,
        tds_deduction: 7000,
        effective_from: '2026-07-20'
      })
      .select()
      .single();
    console.log('Inserted Structure 3 (2026-07-20, basic=60000):', s3?.id);

    // Query latest using EXISTING UI query logic
    const { data: q3 } = await supabase
      .from('faculty_salary_structures')
      .select('*')
      .eq('faculty_id', fac.id)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    console.log('UI Query 3 Result Basic Pay (WITH SAME DATE):', q3?.basic, 'Effective From:', q3?.effective_from, 'ID:', q3?.id);

    // Query latest using PROPER SECONDARY SORTING
    const { data: q3Fixed } = await supabase
      .from('faculty_salary_structures')
      .select('*')
      .eq('faculty_id', fac.id)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    console.log('UI Query 3 WITH CREATED_AT SORTING Basic Pay:', q3Fixed?.basic, 'ID:', q3Fixed?.id);

  } finally {
    // Cleanup test data
    await supabase.from('faculty_salary_structures').delete().eq('faculty_id', fac.id);
    await supabase.from('faculty').delete().eq('id', fac.id);
    console.log('Cleaned test records.');
  }
}

testSalaryOrdering();
