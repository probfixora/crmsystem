-- Migrate existing cases to the new workflow stages

UPDATE cases 
SET current_stage = 'Bank & Finance' 
WHERE current_stage IN ('Banking In Process', 'Loan Approved / Cash Confirmed');

UPDATE cases 
SET current_stage = 'Installation Done' 
WHERE current_stage = 'Electrical Checked';

UPDATE case_history 
SET stage = 'Bank & Finance' 
WHERE stage IN ('Banking In Process', 'Loan Approved / Cash Confirmed');

UPDATE case_history 
SET stage = 'Installation Done' 
WHERE stage = 'Electrical Checked';
