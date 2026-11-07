-- IGNIS seed: 3 cards from ONE BASS/BASS-II paper, so Parts 2–4 have live data on Day 1.
--
-- Source: Zhao, T'ien, Ferkul, Olson — "Concurrent flame growth, spread and extinction over
-- composite fabric samples in low speed purely forced flow in microgravity",
-- 9th U.S. National Combustion Meeting, 2015. NTRS 20150008962.
-- PDF: https://ntrs.nasa.gov/api/citations/20150008962/downloads/20150008962.pdf
--
-- Every quote below was string-matched against the PDF text. Shared facts (verbatim):
--   p.2 "The thickness of the sample is about 0.32 mm with an area density 18.2 mg/cm2."
--   p.3 "Ambient pressure was 1 atm."  (normalized: 101.325 kPa)
--   p.3 "A Kanthal™, 1 hot wire was used to ignite the fuel sample leading edge ..."
--   p.9 Appendix table rows: GMT96-T8 2.2 | 5 | 21 | BASS · GMT96-T7 2.2 | 10 | 21 | BASS
--        · GMT45-T4 2.2 | 10→2.2 | 18.7 | Quenched (BASS-II)
--
-- PUBLICATION STATUS (round 2, A2): all three rows are DRAFTS (verified_by = null), so they are
-- invisible to the public API until R1 (Data & Science Research) re-checks every field against the PDF
-- and publishes them from /curate under their own name. Nobody publishes on someone else's behalf.
-- spread_rate_mm_s is null on purpose: the paper plots spread rates (Fig. 4) but never states numbers.
-- Quote pages and figure pages differ: Fig. 2 is on p.4, Fig. 3 on p.5, Figs. 5/6 on p.6.
--
-- Requires migrations 0001_init.sql AND 0002_round2.sql (condition_changes column).

insert into experiments (
  domain, campaign, test_id, fuel_material, material_class, fuel_form,
  thickness_mm, o2_pct, flow_cm_s, pressure_kpa, ignition_method, outcome, spread_rate_mm_s,
  key_observation_quote, observation_summary,
  source_title, source_url, psi_investigation, source_page, source_figure, source_table, source_section,
  ntrs_id, doi, media_url, telemetry, condition_changes, verified_by, notes
) values
(
  'solid_flammability', 'BASS', 'BASS GMT96-T7', 'cotton_fiberglass', 'fabric', 'fabric',
  0.32, 21, 10, 101.325, 'Kanthal hot wire at fuel sample leading edge (concurrent flow)', 'sustained', null,
  'At about 19s, the flame reached a limiting constant length and a steady spread rate relative to the laboratory [11]. This steady spread state lasted for around 9s.',
  'A 2.2 cm wide SIBAL cotton-fiberglass fabric in 10 cm/s concurrent flow at 21% O2 reached steady spread after about 19 s, then decayed to complete burnout; the whole burn took about 40 s.',
  'Concurrent flame growth, spread and extinction over composite fabric samples in low speed purely forced flow in microgravity',
  'https://ntrs.nasa.gov/citations/20150008962', 'BASS', 3, 'Figure 2',
  'Appendix: Test summary of flat SIBAL fabrics in concurrent flow in BASS and BASS II', '3. Results and Discussion',
  '20150008962', null, null, null, null, null,
  'Sample 2.2 cm wide x 10 cm. Thickness "about 0.32 mm". 1 atm -> 101.325 kPa. Figure 2 linked to GMT96-T7 as the only appendix row (p.9) with 2.2 cm / 10 cm/s / 21% O2. Spread rate only plotted (Fig. 4). Quote p.3; Figure 2 itself is on p.4.'
),
(
  'solid_flammability', 'BASS', 'BASS GMT96-T8', 'cotton_fiberglass', 'fabric', 'fabric',
  0.32, 21, 5, 101.325, 'Kanthal hot wire at fuel sample leading edge (concurrent flow)', 'sustained', null,
  'Because the flow speed is lower, it took more than 60s to burn the whole sample. Steady spread time lasts for about 21s, much longer than the 10 cm/s flow case.',
  'At 5 cm/s and 21% O2 the flame was very dim in side view and burned the whole sample over more than 60 s, with a shorter, slower flame than the 10 cm/s case.',
  'Concurrent flame growth, spread and extinction over composite fabric samples in low speed purely forced flow in microgravity',
  'https://ntrs.nasa.gov/citations/20150008962', 'BASS', 4, 'Figure 3',
  'Appendix: Test summary of flat SIBAL fabrics in concurrent flow in BASS and BASS II', '3. Results and Discussion',
  '20150008962', null, null, null, null, null,
  'Figure 3 linked to GMT96-T8 as the only appendix row (p.9) with 2.2 cm / 5 cm/s / 21% O2. Outcome "sustained" rests on "burn the whole sample". Bright smoldering spots reported behind the flame base.'
),
(
  'solid_flammability', 'BASS-II', 'BASS-II GMT45-T4', 'cotton_fiberglass', 'fabric', 'fabric',
  0.32, 18.7, 2.2, 101.325, 'Kanthal hot wire at fuel sample leading edge (concurrent flow)', 'extinguished', null,
  'As shown in Fig. 5, both the flame length and flame width continued to decrease approaching a circular-shaped blue flame seen from the top. The size of the flame continues to shrink until extinction is reached.',
  'Ignited at 10 cm/s, flow reduced to 2.2 cm/s and held; the flame shrank into a circular blue flame and went out (quenching extinction), leaving unburnt fuel along the holder sides.',
  'Concurrent flame growth, spread and extinction over composite fabric samples in low speed purely forced flow in microgravity',
  'https://ntrs.nasa.gov/citations/20150008962', 'BASS-II', 5, 'Figures 5 and 6',
  'Appendix: Test summary of flat SIBAL fabrics in concurrent flow in BASS and BASS II', '3. Results and Discussion',
  '20150008962', null, null, null, '[{"parameter":"flow_cm_s","from":10,"to":2.2,"stored":"final_held","note":"ignited at 10 cm/s, reduced incrementally after ignition to 2.2 cm/s and held for the remainder of the test (p.5)"}]'::jsonb, null,
  'Flow NOT constant: ignited at 10 cm/s, reduced to 2.2 cm/s "and held there for the remainder of the test"; flow_cm_s stores the held value. Appendix (p.9) lists GMT45-T4 as 10->2.2 cm/s, 18.7% O2, Quenched. OPEN QUESTION FOR R1: should a changing-flow quenching test be carded with the held flow (current choice, flagged in condition_changes) or kept out of constant-flow comparisons entirely?'
);
