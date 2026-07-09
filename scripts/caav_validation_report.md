# Báo cáo kiểm tra dữ liệu CAAV

- **Tổng câu parse được:** 3509
- **Đọc được đáp án từ ô vàng (dùng được cho Test/Thi):** 3449
- **Thiếu đáp án (missing_answer):** 17
- **Bôi vàng >1 đáp án (multi_answer):** 13
- **Thiếu option:** 2
- **Nhóm câu trùng lặp:** 27

## Theo CRS
- A: 586
- B1: 955
- B2: 873
- ALL: 1095

## Theo nhóm (sectionType)
- TypeEngine: 2414
- LAW: 600
- English: 495

## Theo động cơ
- CFM56: 306
- LEAP-1A: 201
- V2500: 250

## Theo từng file

| File | Tên nêu | Parse | OK | Thiếu ĐA | Multi | Thiếu opt | ATA |
|------|--------:|------:|---:|--------:|------:|---------:|----:|
| 1. A320 Airfame CAT A (420 Questio | 420 | 419 | 419 | 0 | 0 | 0 | 25 |
| 2. A320 Airfame CAT B1 (620Questio | 620 | 620 | 620 | 0 | 0 | 0 | 30 |
| 3. A320 Airfame CAT B2 (620Questio | 620 | 618 | 613 | 5 | 0 | 0 | 24 |
| 4. CFM56 Engine CAT A (66 Question | 66 | 66 | 66 | 0 | 0 | 0 | 0 |
| 5. CFM56 Engine CAT B1 (135 Questi | 135 | 135 | 135 | 0 | 0 | 0 | 0 |
| 6. CFM56 Engine CAT B2 (105 Questi | 105 | 105 | 105 | 0 | 0 | 0 | 0 |
| 7. LEAP-1A Engine  CAT A (50 Quest | 50 | 51 | 49 | 1 | 0 | 0 | 10 |
| 8. LEAP-1A Engine  CAT B1 (100 Que | 100 | 100 | 100 | 0 | 0 | 0 | 10 |
| 9. LEAP-1A Engine  CAT B2 (50 Ques | 50 | 50 | 50 | 0 | 0 | 0 | 10 |
| 10. V2500 Engine CAT A (50 Questio | 50 | 50 | 50 | 0 | 0 | 0 | 0 |
| 11. V2500 Engine CAT B1 (100 Quest | 100 | 100 | 100 | 0 | 0 | 0 | 0 |
| 12. V2500 Engine CAT B2 (100 Quest | 100 | 100 | 99 | 1 | 0 | 0 | 0 |
| Aviation Legislation - Question Ba | None | 600 | 589 | 2 | 2 | 0 | 1 |
| Aviation Technical English Bank re | None | 495 | 454 | 8 | 11 | 2 | 0 |

## Câu cần kiểm tra thủ công (60)

Các câu dưới đây **không** được đưa vào Test Bank / Thi Thử cho tới khi xác nhận.

- `3. A320 Airfame CAT B2 (62` Q106 [missing_answer] In normal operation the ADIRUs are aligned using information from the: — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `3. A320 Airfame CAT B2 (62` Q158 [missing_answer] The FCU allows: (B2) — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `3. A320 Airfame CAT B2 (62` Q159 [missing_answer] The Flight Director is engaged: (B2) — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `3. A320 Airfame CAT B2 (62` Q160 [missing_answer] The AFS computers are: (B2) — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `3. A320 Airfame CAT B2 (62` Q161 [missing_answer] The FMGC functions are: (B2) — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `7. LEAP-1A Engine  CAT A (` Q36 [missing_answer] Where are EGT sensors located? (CAT A, B1, B2) — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `7. LEAP-1A Engine  CAT A (` Q1 [missing_question]  — Thiếu nội dung câu hỏi.
- `12. V2500 Engine CAT B2 (1` Q28 [missing_answer] Where is the fuel temperature measured on the engine? — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Legislation - Que` Q35 [missing_answer] Time limit for reporting aircraft incidents is: — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Legislation - Que` Q39 [missing_answer] What is the enforcement effect of the 2006 civil aviation law? — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Legislation - Que` Q118 [conflict] If an Airworthiness Directive has not been complied with within the fl — Ô vàng và dòng 'Correct Answer is' đá nhau — nguồn tự mâu thuẫn, cần soát tay.
- `Aviation Legislation - Que` Q347 [conflict] The privileges of VAR Part 7 licensed AMT category B2 is. — Ô vàng và dòng 'Correct Answer is' đá nhau — nguồn tự mâu thuẫn, cần soát tay.
- `Aviation Legislation - Que` Q403 [conflict] Which following statement about a maintenance release is not correct? — Ô vàng và dòng 'Correct Answer is' đá nhau — nguồn tự mâu thuẫn, cần soát tay.
- `Aviation Legislation - Que` Q5 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Legislation - Que` Q444 [conflict] VAR Part 7 licensed AMT category B2 can — Ô vàng và dòng 'Correct Answer is' đá nhau — nguồn tự mâu thuẫn, cần soát tay.
- `Aviation Legislation - Que` Q470 [multi_answer] The time scale for retaining training records within a VAR Part 9 ATO  — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Legislation - Que` Q493 [multi_answer] A rated aircraft maintenance engineer may issue a CRS (Certificate of  — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Legislation - Que` Q505 [conflict] A category B1 certifying staff is permitted to issue certificates of r — Ô vàng và dòng 'Correct Answer is' đá nhau — nguồn tự mâu thuẫn, cần soát tay.
- `Aviation Legislation - Que` Q520 [conflict] An Airworthiness Directive contains. — Ô vàng và dòng 'Correct Answer is' đá nhau — nguồn tự mâu thuẫn, cần soát tay.
- `Aviation Technical English` Q221 [missing_options] The ground power unit_______electrical power on the ground. A . provid — Thiếu đáp án — kiểm tra layout câu này.
- `Aviation Technical English` Q861 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q862 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q863 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q864 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q865 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q866 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q867 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q868 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q869 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q870 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q742 [multi_answer] A. ensure — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q746 [multi_answer] A. loading shed — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q681 [missing_answer] A. Do not — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Technical English` Q683 [missing_answer] A. Let — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Technical English` Q684 [missing_answer] A.when — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Technical English` Q686 [missing_answer] A.reason — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Technical English` Q689 [missing_answer] A. Change — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Technical English` Q628 [multi_answer] A. while — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q566 [multi_answer] A. may be removed — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q568 [multi_answer] A. replacing — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q502 [missing_answer] A. A320 — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Technical English` Q503 [missing_options] A. are manufactured — Thiếu đáp án — kiểm tra layout câu này.
- `Aviation Technical English` Q506 [missing_answer] A. is only known — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.
- `Aviation Technical English` Q510 [multi_answer] A. more than great — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q441 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q442 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q443 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q444 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q445 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q446 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q447 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q448 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q449 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q450 [missing_question]  — Thiếu nội dung câu hỏi.
- `Aviation Technical English` Q385 [multi_answer] A. centre — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q390 [multi_answer] A. so far — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q205 [multi_answer] A. for — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q210 [multi_answer] A. the same way — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q150 [multi_answer] A. and — File gốc bôi vàng >1 đáp án — chọn đáp án đúng thủ công.
- `Aviation Technical English` Q9 [missing_answer] AIR INTAKE COWL-DESCRIPTION AND OPERATION 1/ General The engine air in — Không thấy ô vàng — mở PDF, kiểm tra đáp án đúng.