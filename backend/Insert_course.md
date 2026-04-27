**IT-SE:**

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 1

FROM courses

WHERE code IN (

    'CEA201', 'CSI104', 'MAE101', 'PRF192', 'SSL101c'

)

ON CONFLICT DO NOTHING;



-- Semester 2

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 2

FROM courses

WHERE code IN (

&nbsp;   'MAD101', 'NWC203c', 'OSG202', 'PRO192', 'SSG104'

)

ON CONFLICT DO NOTHING;



-- Semester 3

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 3

FROM courses

WHERE code IN (

&nbsp;   'CSD201', 'DBI202', 'JPD113', 'LAB211', 'WED201c'

)

ON CONFLICT DO NOTHING;



-- Semester 4

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 4

FROM courses

WHERE code IN (

&nbsp;   'JPD123', 'MAS291', 'PRJ301', 'SWE201c', 'IOT102'

)

ON CONFLICT DO NOTHING;



-- Semester 5

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 5

FROM courses

WHERE code IN (

&nbsp;   'SWP391', 'SWR302', 'SWT301', 'ITE302c', 'WDU203c'

)

ON CONFLICT DO NOTHING;



-- Semester 6

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 6

FROM courses

WHERE code IN (

&nbsp;   'OJT202', 'ENW493c'

)

ON CONFLICT DO NOTHING;



-- Semester 7

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 7

FROM courses

WHERE code IN (

&nbsp;   'PMG201c', 'SWD392', 'SYB302c'

)

ON CONFLICT DO NOTHING;



-- Semester 8

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 8

FROM courses

WHERE code IN (

&nbsp;   'MLN111', 'MLN122', 'PRM392'

)

ON CONFLICT DO NOTHING;



-- Semester 9

INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 9

FROM courses

WHERE code IN (

&nbsp;   'HCM202', 'MLN131', 'VNR202', 'SEP490'

)

ON CONFLICT DO NOTHING;



INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)

SELECT DISTINCT 12, id, 2

FROM courses

WHERE code IN (

    'CEA201', 'CSI104', 'MAE101', 'PHE\_COM\*2', 'PRF192', 'SSL101c',

    'MAD101', 'NWC203c', 'OSG202', 'PHE\_COM\*3', 'PRO192', 'SSG104',

    'CSD201', 'DBI202', 'JPD113', 'LAB211', 'WED201c', 'IOT102',

    'JPD123', 'MAS291', 'PRJ301', 'SWE201c', 'ITE302c', 'SE\_COM\*1',

    'SWP391', 'SWR302', 'SWT301', 'ENW493c', 'OJT202', 'EXE101',

    'PMG201c', 'SE\_COM\*2', 'SE\_COM\*3', 'SWD392', 'EXE201', 'MLN111',

    'MLN122', 'PRM392', 'SE\_COM\*4\_ELE', 'WDU203c', 'HCM202', 'MLN131',

    'SE\_GRA\_ELE', 'VNR202', 'NWC204', 'PRM393', 'CSI106', 'SYB302c',

    'ENW492c', 'PMG202c', 'SE\_COM\*4', 'SE\_COM\*5', 'SEP490'

)

ON CONFLICT DO NOTHING;



**-- Specialization 11 IT-IA**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 11, id, 1**

**FROM courses**

**WHERE code IN (**

    **'CEA201', 'CSI104', 'MAE101', 'PHE\_COM\*2', 'PRF192', 'SSL101c',**

    **'MAD101', 'NWC204', 'OSG202', 'PHE\_COM\*3', 'PRO192', 'SSG104',**

    **'CSD201', 'DBI202', 'IA\_ELE2', 'JPD113', 'LAB211', 'IOT102',**

    **'ITE302c', 'JPD123', 'MAS291', 'OSP201', 'CRY303c', 'FRS301',**

    **'IA\_ELE3', 'IAA202', 'IAM302', 'ENW492c', 'OJT202', 'EXE101',**

    **'HOD401', 'IA\_COM\*1', 'IA\_COM\*2', 'IAP301', 'EXE201', 'IA\_COM\*3',**

    **'IA\_COM\*4\_ELE', 'MLN111', 'MLN122', 'PMG201c', 'HCM202',**

    **'IA\_GRA\_ELE', 'MLN131', 'VNR202', 'IA\_ELE1', 'ENW493c'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 10 IT-AI**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 10, id, 1**

**FROM courses**

**WHERE code IN (**

    **'CSI105', 'MAD101', 'MAE101', 'PFP191', 'PHE\_COM\*2', 'SSL101c',**

    **'AIG201c', 'CEA201', 'CSD203', 'DBI202', 'PHE\_COM\*3', 'SSG104',**

    **'ADY201m', 'ITE303c', 'JPD113', 'MAI391', 'MAS291', 'AIL303m',**

    **'CPV301', 'DAP391m', 'JPD123', 'SWE201c', 'AI17\_COM\*1', 'AI17\_COM\*2',**

    **'DPL302m', 'DWP301c', 'NLP301c', 'OJT202', 'AI17\_COM\*3', 'DAT301m',**

    **'ENW492c', 'EXE101', 'PMG201c', 'AI17\_COM\*4', 'AID301c', 'EXE201',**

    **'MLN111', 'MLN122', 'REL301m', 'AI17\_GRA\_ELE', 'HCM202', 'MLN131',**

    **'VNR202', 'ENW493c', 'AIG202c'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 13 IT-IS**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 13, id, 1**

**FROM courses**

**WHERE code IN (**

    **'CEA201', 'CSI104', 'MAE101', 'PHE\_COM\*2', 'PRF192', 'SSL101c',**

    **'MAD101', 'NWC204', 'OSG202', 'PHE\_COM\*3', 'PRO192', 'SSG104',**

    **'CSD201', 'DBI202', 'ITA203c', 'JPD113', 'LAB211', 'JPD123',**

    **'MAS291', 'PRC392c', 'PRJ302', 'SWE201c', 'DTA301', 'ISM302',**

    **'ISP392', 'ITA301', 'ITE302c', 'ENW493c', 'OJT202', 'EXE101',**

    **'IS\_COM\*1', 'IS\_COM\*2', 'ISC301', 'ITB302c', 'EXE201', 'IS\_COM\*3',**

    **'IS\_COM\*4', 'MLN111', 'MLN122', 'PMG201c', 'HCM202', 'IS\_GRA\_ELE',**

    **'MLN131', 'VNR202', 'CSI106', 'NWC203c'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 14 IT-GD**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 14, id, 1**

**FROM courses**

**WHERE code IN (**

    **'DRP101', 'DRS102', 'DTG102', 'PHE\_COM\*2', 'SSL101c', 'VCM202',**

    **'AFA201', 'GD\_ELE1', 'GDF201', 'PHE\_COM\*3', 'PST202', 'SSG104',**

    **'ANS201', 'GD\_ELE2', 'JPD113', 'PFD201', 'TPG203', 'ANC301',**

    **'DTG303', 'JPD123', 'TPG302', 'WDU202c', 'CAA201', 'DTG304',**

    **'GD\_COM\*1', 'GD\_COM\*2', 'HOA102', 'ENW492c', 'OJT202', 'EXE101',**

    **'GD\_COM\*3', 'GD\_COM\*4', 'SDP201', 'VNC104', 'AET102c', 'EXE201',**

    **'GD\_COM\*5', 'HOD102', 'IPR102', 'MLN111', 'MLN122', 'GD\_GRA\_ELE1.1',**

    **'HCM202', 'MLN131', 'VNR202', 'DTG302'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 16 KOR-KOR**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 16, id, 1**

**FROM courses**

**WHERE code IN (**

    **'KRL112', 'KRL122', 'PHE\_COM\*2', 'SSL101c', 'KRL212', 'KRL222',**

    **'PHE\_COM\*3', 'SSG104', 'KRL312', 'KRL322', 'KRP301', 'KRG301',**

    **'KRL402', 'KRL502', 'ENW492c', 'KLE301', 'KLI311', 'KLT311',**

    **'KRC301', 'KLR301c', 'OJK202', 'BKR\_COM\*1', 'EXE101', 'KIT491',**

    **'KLI321', 'KLT321', 'BKR\_COM\*2', 'BKR\_COM\*3', 'BKR\_COM\*4', 'EXE201',**

    **'MLN111', 'MLN122', 'BKR\_GRA\_ELE', 'HCM202', 'MLN131', 'VNR202',**

    **'KRL101', 'KRL201', 'KRL311', 'KRL321', 'KRL411', 'KRL421',**

    **'KRL511', 'KRL521'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 15 JAP-JAP**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 15, id, 1**

**FROM courses**

**WHERE code IN (**

    **'JPD116', 'JPD126', 'PHE\_COM\*2', 'SSL101c', 'JPD216', 'JPD226',**

    **'PHE\_COM\*3', 'SSG104', 'JIJ301', 'JPD316', 'JPD326', 'JPB301',**

    **'JPD336', 'JPD346', 'JBI301', 'JBT301', 'JIG301', 'JJB391',**

    **'JSC301', 'ENW492c', 'OJP202', 'BJP\_COM\*1', 'BJP\_COM\*2', 'BJP\_COM\*3',**

    **'EXE101', 'JJL301', 'BJP\_COM\*4', 'EXE201', 'JLR302', 'LTG203',**

    **'MLN111', 'MLN122', 'BJP\_GRA\_ELE', 'HCM202', 'MLN131', 'VNR202',**

    **'JIS301', 'JJS301', 'JTS301'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 17 ECON-HOTEL**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 17, id, 1**

**FROM courses**

**WHERE code IN (**

    **'ENH301', 'HMO102', 'MGT103', 'MKT101', 'PHE\_COM\*2', 'SSL101c',**

    **'ACC101', 'ENH401', 'HOM202', 'OBE102c', 'PHE\_COM\*3', 'SSG104',**

    **'CIH201', 'ECO102', 'FIN202', 'HRM201c', 'IBC201', 'CHN111',**

    **'EVN201', 'FBM201', 'ITA203c', 'MAS202', 'CHN122', 'HM\_COM\*1',**

    **'HM\_COM\*2', 'HM\_COM\*3', 'MKT208c', 'OJB202', 'SYB302c', 'ENW492c',**

    **'HM\_COM\*4', 'HM\_COM\*5', 'HOM301c', 'SSB201', 'GEM201', 'LAW102',**

    **'MLN111', 'MLN122', 'PMG201c', 'RMB301', 'HCM201', 'HM\_ELE',**

    **'MLN131', 'VNR202', 'CHN113', 'CHN123', 'EXE101', 'EXE201',**

    **'HCM202', 'HM\_GRA\_ELE'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 18 ECON-MKT**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 18, id, 1**

**FROM courses**

**WHERE code IN (**

    **'ECO111', 'ENM301', 'MGT103', 'MKT101', 'PHE\_COM\*2', 'SSL101c',**

    **'ACC101', 'ECO121', 'ENM401', 'OBE102c', 'PHE\_COM\*3', 'SSG104',**

    **'DMS301m', 'FIN202', 'HRM201c', 'MKT201', 'MKT304', 'CHN113',**

    **'DMA301m', 'ITA203c', 'MAS202', 'MKT202', 'CHN123', 'DTG111',**

    **'MKT208c', 'SAL301', 'SSB201', 'ENW492c', 'OJB202', 'EXE101',**

    **'LAW102', 'MKT\_COM\*1', 'MKT\_COM\*2', 'MKT\_COM\*3', 'EXE201',**

    **'MKT\_COM\*4', 'MKT301', 'MLN111', 'MLN122', 'PMG201c', 'HCM202',**

    **'MKT\_GRA\_ELE', 'MLN131', 'VNR202'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 19 ECON-INT**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 19, id, 1**

**FROM courses**

**WHERE code IN (**

    **'ECO111', 'ENM301', 'MGT103', 'MKT101', 'PHE\_COM\*2', 'SSL101c',**

    **'ACC101', 'ECO121', 'ENM401', 'OBE102c', 'PHE\_COM\*3', 'SSG104',**

    **'ECO201', 'FIN202', 'HRM201c', 'IBC201', 'IBI101', 'CHN113',**

    **'IBF301', 'ITA203c', 'MAS202', 'SCM201', 'CHN123', 'IBS301m',**

    **'IEI301', 'MKT205c', 'SSB201', 'ENW492c', 'OJB202', 'EXE101',**

    **'IB\_COM\*1', 'IB\_COM\*2', 'IB\_COM\*3', 'LAW102', 'EXE201', 'IB\_COM\*4',**

    **'MLN111', 'MLN122', 'PMG201c', 'RMB301', 'HCM202', 'IB\_GRA\_ELE',**

    **'MLN131', 'VNR202'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 20 ECON-MUL**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 20, id, 1**

**FROM courses**

**WHERE code IN (**

    **'DTG111', 'MED201', 'MGT103', 'MKT101', 'PHE\_COM\*2', 'SSL101c',**

    **'ACC101', 'CMC201c', 'DTG121', 'MMP201', 'PHE\_COM\*3', 'SSG104',**

    **'CCO201', 'MKT208c', 'PFD201', 'RMC301', 'SDP201', 'CHN113',**

    **'IPR102', 'MSM201c', 'VDP301', 'WMC201', 'CHN123', 'MC\_COM\*1',**

    **'MCO201m', 'MKT304', 'WDU202c', 'ENW492c', 'OJB202', 'BRA301',**

    **'EXE101', 'MC\_COM\*2', 'MC\_COM\*3', 'MEP301', 'EXE201', 'IFT201c',**

    **'MC\_COM\*4', 'MLN111', 'MLN122', 'PMG201c', 'BBA\_MC\_GRA\_ELE', 'HCM202',**

    **'MLN131', 'VNR202', 'IMC301c', 'MCO201c', 'MPL201', 'MCO302',**

    **'PRE301', 'EVN301', 'CCM301'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 21 ECON-FIN**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 21, id, 1**

**FROM courses**

**WHERE code IN (**

    **'ACC101', 'ECO111', 'ENM301', 'MGT103', 'PHE\_COM\*2', 'SSL101c',**

    **'ECO121', 'ENM401', 'FIN202', 'OBE102c', 'PHE\_COM\*3', 'SSG104',**

    **'ACC302', 'FIN201', 'FIN303', 'HRM201c', 'MKT101', 'ACC305',**

    **'CHN113', 'FIN301', 'ITA203c', 'MAS202', 'CHN123', 'FIM302c',**

    **'FIN402', 'RMB302', 'SSB201', 'ENW492c', 'OJB202', 'EXE101',**

    **'FIN\_COM\*1', 'FIN\_COM\*2', 'FIN\_COM\*3', 'LAW102', 'BKG303', 'EXE201',**

    **'FIN\_COM\*4', 'MLN111', 'MLN122', 'PMG201c', 'FIN\_GRA\_ELE', 'HCM202',**

    **'MLN131', 'VNR202'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 22 ECON-TOUR**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 22, id, 1**

**FROM courses**

**WHERE code IN (**

    **'ECO111', 'ENH301', 'MGT103', 'MKT101', 'PHE\_COM\*2', 'SSL101c',**

    **'ACC101', 'ECO121', 'ENH401', 'OBE102c', 'PHE\_COM\*3', 'SSG104',**

    **'FIN202', 'HMO102', 'HRM201c', 'TTG201', 'VNC104', 'CHN113',**

    **'EVN201', 'ITA203c', 'MAS202', 'TTM201', 'CHN123', 'MKT208c',**

    **'SSB201', 'TTM202', 'TTM203', 'ENW492c', 'OJB202', 'EXE101',**

    **'LAW102', 'TM\_COM\*1', 'TM\_COM\*2', 'TM\_COM\*3', 'EXE201', 'MLN111',**

    **'MLN122', 'PMG201c', 'RMB301', 'TM\_COM\*4', 'HCM202', 'MLN131',**

    **'TM\_GRA\_ELE', 'VNR202'**

**)**

**ON CONFLICT DO NOTHING;**



**-- Specialization 9 ENG-ENG**

**INSERT INTO specialization\_courses (specialization\_id, course\_id, semester)**

**SELECT DISTINCT 9, id, 1**

**FROM courses**

**WHERE code IN (**

    **'EAW212', 'ECR202', 'ENG302c', 'ENP102', 'PHE\_COM\*2', 'SSG104',**

    **'EAL202', 'EAW222', 'ECB101', 'LTG202', 'PHE\_COM\*3', 'SSL101c',**

    **'CHN113', 'ERW412', 'LIT301', 'SEM101', 'SSC302c', 'CHN123',**

    **'ECC301c', 'EPC301', 'ERW422', 'ESL101', 'EBC301c', 'ELI302',**

    **'ELT302', 'ENB302', 'VNC104', 'EPE301c', 'OJE202', 'BEN\_COM\*1',**

    **'BEN\_COM\*2', 'ELI402', 'ELT402', 'EXE101', 'BEN\_COM\*3', 'BEN\_COM\*4',**

    **'ELR301', 'EXE201', 'MLN111', 'MLN122', 'BEN\_GRA\_ELE', 'HCM202'**

**)**

**ON CONFLICT DO NOTHING;**



