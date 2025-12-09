'use client'

// ================================================================
// 휴가신청서 PDF 컴포넌트
// @react-pdf/renderer 사용
// 피그마 디자인 기준 레이아웃
// ================================================================

import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
  Svg,
  Rect,
} from '@react-pdf/renderer'
import {
  LeaveRequestPDFData,
  ApproverInfo,
  LeaveTypeLabelMap,
  ApprovalStatusLabelMap,
} from './types'
import {
  splitLeavePeriodByWeekend,
  formatDateRange,
  formatDaysCount,
  formatDateKorean,
} from './utils'

// 한글 폰트 등록 (Spoqa Han Sans Neo)
Font.register({
  family: 'NotoSansKR',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src: 'https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Bold.ttf',
      fontWeight: 'bold',
    },
  ],
})

// ================================================================
// 스타일 정의
// ================================================================

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    backgroundColor: '#ffffff',
  },

  // 제목 (박스 없음)
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },

  // 결재란 (2x2 그리드)
  approvalSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 120,
    marginBottom: 15,
  },
  approvalBox: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: -1,
    marginBottom: -1,
  },
  approvalSignArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 30,
  },
  approvalStatus: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  approvalFooter: {
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalFooterText: {
    fontSize: 7,
  },

  // 참조자 섹션 (별도)
  ccSection: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 15,
    minHeight: 32,
  },
  ccLabel: {
    width: 60,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    paddingLeft: 8,
    backgroundColor: '#f5f5f5',
  },
  ccLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  ccContent: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
    paddingVertical: 5,
  },
  ccContentText: {
    fontSize: 9,
  },

  // 메인 컨테이너 (성명/소속부터 하단까지 연결)
  mainContainer: {
    borderWidth: 1,
    borderColor: '#000',
  },

  // 성명/소속 행
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 36,
  },
  infoCell: {
    flex: 1,
    flexDirection: 'row',
  },
  infoCellBorder: {
    borderRightWidth: 1,
    borderColor: '#000',
  },
  infoLabel: {
    width: 60,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  infoLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoValue: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
  },
  infoValueText: {
    fontSize: 10,
  },

  // 보유연차 행
  leaveBalanceRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 32,
  },
  leaveBalanceLabel: {
    width: 80,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  leaveBalanceValue: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 휴가기간 테이블 (휴가기간 라벨 세로 병합)
  periodSection: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  periodLabelColumn: {
    width: 80,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  periodLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  periodTableColumn: {
    flex: 1,
  },
  periodTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 28,
  },
  periodTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 28,
  },
  periodTableRowLast: {
    flexDirection: 'row',
    minHeight: 28,
  },
  periodDateCell: {
    flex: 2,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodTypeCell: {
    flex: 1.5,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodDaysCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodCellText: {
    fontSize: 9,
  },
  periodCellTextBold: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // 잔여연차/총휴가일수 행
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 32,
  },
  summaryLabelCell: {
    width: 80,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  summaryValueCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryValueCellLast: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 하단 영역 (박스 안에 포함)
  footerSection: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
  },
  footerDate: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 30,
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  logoBar: {
    width: 6,
    height: 30,
    marginRight: 2,
  },
  logoTextContainer: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoSubText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  signatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 10,
  },
})

// ================================================================
// 컴포넌트
// ================================================================

// 결재란 박스 (2x2 그리드용)
interface ApprovalBoxProps {
  approver?: ApproverInfo
  isEmpty?: boolean
}

const ApprovalBox: React.FC<ApprovalBoxProps> = ({ approver, isEmpty }) => {
  const getStatusColor = (status: ApproverInfo['status']) => {
    switch (status) {
      case 'approved':
        return '#0066cc'
      case 'rejected':
        return '#cc0000'
      case 'pending':
        return '#ff9900'
      default:
        return '#999999'
    }
  }

  if (isEmpty || !approver) {
    return (
      <View style={styles.approvalBox}>
        <View style={styles.approvalSignArea} />
        <View style={styles.approvalFooter} />
      </View>
    )
  }

  return (
    <View style={styles.approvalBox}>
      <View style={styles.approvalSignArea}>
        {approver.status === 'approved' || approver.status === 'rejected' ? (
          <Text
            style={[
              styles.approvalStatus,
              { color: getStatusColor(approver.status) },
            ]}
          >
            {ApprovalStatusLabelMap[approver.status]}
          </Text>
        ) : (
          <Text style={[styles.approvalStatus, { color: '#999' }]}>
            {ApprovalStatusLabelMap[approver.status]}
          </Text>
        )}
      </View>
      <View style={styles.approvalFooter}>
        <Text style={styles.approvalFooterText}>{approver.name}</Text>
      </View>
    </View>
  )
}

// 메인 PDF 문서
interface LeaveRequestPDFProps {
  data: LeaveRequestPDFData
}

export const LeaveRequestPDF: React.FC<LeaveRequestPDFProps> = ({ data }) => {
  // 주말 기준으로 휴가 기간 분리
  const periodRows = splitLeavePeriodByWeekend(
    data.startDate,
    data.endDate,
    data.leaveType
  )

  // 참조자가 있는지 확인
  const hasCCList = data.ccList && data.ccList.length > 0

  // 결재자 배열 (최대 4명, 2x2 그리드)
  const approversForGrid = [...data.approvers.slice(0, 4)]
  while (approversForGrid.length < 4) {
    approversForGrid.push(undefined as unknown as ApproverInfo)
  }

  // 최소 5행 유지를 위한 빈 행 수 계산
  const minRows = 5
  const emptyRowCount = Math.max(0, minRows - periodRows.length)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 제목 (박스 없음) */}
        <Text style={styles.title}>휴가신청서</Text>

        {/* 결재란 (2x2 그리드) */}
        <View style={styles.approvalSection}>
          {approversForGrid.map((approver, index) => (
            <ApprovalBox
              key={approver?.id || `empty-${index}`}
              approver={approver}
              isEmpty={!approver}
            />
          ))}
        </View>

        {/* 참조자 (있는 경우에만 표시) */}
        {hasCCList && (
          <View style={styles.ccSection}>
            <View style={styles.ccLabel}>
              <Text style={styles.ccLabelText}>참조자</Text>
            </View>
            <View style={styles.ccContent}>
              <Text style={styles.ccContentText}>
                {data.ccList!.map((cc) => `${cc.name} (${cc.department})`).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* 메인 컨테이너 (성명/소속부터 하단까지 연결된 박스) */}
        <View style={styles.mainContainer}>
          {/* 성명/소속 행 */}
          <View style={styles.infoRow}>
            <View style={[styles.infoCell, styles.infoCellBorder]}>
              <View style={styles.infoLabel}>
                <Text style={styles.infoLabelText}>성명</Text>
              </View>
              <View style={styles.infoValue}>
                <Text style={styles.infoValueText}>{data.requester.name}</Text>
              </View>
            </View>
            <View style={styles.infoCell}>
              <View style={styles.infoLabel}>
                <Text style={styles.infoLabelText}>소속</Text>
              </View>
              <View style={styles.infoValue}>
                <Text style={styles.infoValueText}>{data.requester.department}</Text>
              </View>
            </View>
          </View>

          {/* 보유연차 행 */}
          <View style={styles.leaveBalanceRow}>
            <View style={styles.leaveBalanceLabel}>
              <Text style={styles.infoLabelText}>보유연차</Text>
            </View>
            <View style={styles.leaveBalanceValue}>
              <Text style={styles.infoValueText}>{data.totalLeave}</Text>
            </View>
          </View>

          {/* 휴가기간 테이블 (휴가기간 라벨 세로 병합) */}
          <View style={styles.periodSection}>
            {/* 왼쪽: 휴가기간 라벨 (세로 병합) */}
            <View style={styles.periodLabelColumn}>
              <Text style={styles.periodLabelText}>휴가기간</Text>
            </View>

            {/* 오른쪽: 일자/유형/기간 테이블 */}
            <View style={styles.periodTableColumn}>
              {/* 헤더 */}
              <View style={styles.periodTableHeader}>
                <View style={styles.periodDateCell}>
                  <Text style={styles.periodCellTextBold}>일자</Text>
                </View>
                <View style={styles.periodTypeCell}>
                  <Text style={styles.periodCellTextBold}>유형</Text>
                </View>
                <View style={styles.periodDaysCell}>
                  <Text style={styles.periodCellTextBold}>기간</Text>
                </View>
              </View>

              {/* 휴가 기간 행들 */}
              {periodRows.map((period, index) => (
                <View
                  key={index}
                  style={
                    index === periodRows.length - 1 && emptyRowCount === 0
                      ? styles.periodTableRowLast
                      : styles.periodTableRow
                  }
                >
                  <View style={styles.periodDateCell}>
                    <Text style={styles.periodCellText}>
                      {formatDateRange(period.startDate, period.endDate)}
                    </Text>
                  </View>
                  <View style={styles.periodTypeCell}>
                    <Text style={styles.periodCellText}>
                      {LeaveTypeLabelMap[period.leaveType] || '연차'}
                    </Text>
                  </View>
                  <View style={styles.periodDaysCell}>
                    <Text style={styles.periodCellText}>
                      {formatDaysCount(period.days)}
                    </Text>
                  </View>
                </View>
              ))}

              {/* 빈 행 추가 (최소 5행 유지) */}
              {Array.from({ length: emptyRowCount }).map((_, index) => (
                <View
                  key={`empty-${index}`}
                  style={
                    index === emptyRowCount - 1
                      ? styles.periodTableRowLast
                      : styles.periodTableRow
                  }
                >
                  <View style={styles.periodDateCell} />
                  <View style={styles.periodTypeCell} />
                  <View style={styles.periodDaysCell} />
                </View>
              ))}
            </View>
          </View>

          {/* 잔여연차/총휴가일수 행 */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelCell}>
              <Text style={styles.infoLabelText}>잔여연차</Text>
            </View>
            <View style={styles.summaryValueCell}>
              <Text style={styles.infoValueText}>{data.remainingLeave}</Text>
            </View>
            <View style={styles.summaryLabelCell}>
              <Text style={styles.infoLabelText}>총휴가일수</Text>
            </View>
            <View style={styles.summaryValueCellLast}>
              <Text style={styles.infoValueText}>{data.totalDays}</Text>
            </View>
          </View>

          {/* 하단 영역 (박스 안에 포함) */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>위와 같이 휴가를 신청합니다.</Text>
            <Text style={styles.footerDate}>{formatDateKorean(data.createdAt)}</Text>

            <View style={styles.signatureSection}>
              {/* 회사 로고 (3개 막대 + 텍스트) */}
              <View style={styles.logoContainer}>
                <View style={styles.logoBars}>
                  <View style={[styles.logoBar, { backgroundColor: '#000' }]} />
                  <View style={[styles.logoBar, { backgroundColor: '#000' }]} />
                  <View style={[styles.logoBar, { backgroundColor: '#2D8B4E' }]} />
                </View>
                <View style={styles.logoTextContainer}>
                  <Text style={styles.logoText}>MUST</Text>
                  <Text style={styles.logoSubText}>COMPANY</Text>
                </View>
              </View>

              {/* 신청인 */}
              <View style={styles.signatureContainer}>
                <Text style={styles.signatureLabel}>신청인 :</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default LeaveRequestPDF
