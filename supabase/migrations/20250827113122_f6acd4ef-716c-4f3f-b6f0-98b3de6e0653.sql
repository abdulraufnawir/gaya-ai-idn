-- Update the existing completed project to add the missing result URL
UPDATE projects 
SET result_url = 'https://tempfile.aiquickdraw.com/r/15a7b7774a1eb95fdeedc1dc7936f19f_1756294072.jpg'
WHERE id = '52399121-79af-412e-a70f-3553cf2de2df' 
AND status = 'completed';