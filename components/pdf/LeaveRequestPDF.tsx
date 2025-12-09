'use client'

// ================================================================
// 휴가신청서 PDF 컴포넌트
// @react-pdf/renderer 사용
// ================================================================

import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
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

// 한글 폰트 등록 (Noto Sans KR)
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
    padding: 20,
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    backgroundColor: '#ffffff',
  },

  // 제목
  titleContainer: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 15,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // 결재란
  approvalSection: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  approvalBox: {
    width: 56,
    height: 90,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: -1, // 테두리 겹침 방지
  },
  approvalBoxLast: {
    width: 56,
    height: 90,
    borderWidth: 1,
    borderColor: '#000',
  },
  approvalHeader: {
    height: 24,
    borderBottomWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  approvalHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  approvalSignArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalSignText: {
    fontSize: 8,
    color: '#666',
  },
  approvalStatus: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  approvalFooter: {
    height: 20,
    borderTopWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalFooterText: {
    fontSize: 7,
  },

  // 참조자 섹션
  ccSection: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
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

  // 신청자 정보
  infoSection: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
  },
  infoCell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 40,
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

  // 연차 정보
  leaveInfoRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    borderTopWidth: 0,
    minHeight: 32,
  },
  leaveInfoRowFirst: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 32,
  },
  leaveInfoLabel: {
    width: 80,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  leaveInfoValue: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 휴가 기간 테이블
  periodTable: {
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
  },
  periodTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    backgroundColor: '#f5f5f5',
    minHeight: 28,
  },
  periodTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 32,
  },
  periodTableRowLast: {
    flexDirection: 'row',
    minHeight: 32,
  },
  periodLabelCell: {
    width: 80,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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

  // 합계 행
  summaryRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    borderTopWidth: 0,
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

  // 하단 영역
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    marginBottom: 30,
  },
  footerDate: {
    fontSize: 10,
    marginBottom: 40,
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 120,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoSubText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  signatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    marginRight: 10,
  },
  signatureBox: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

// ================================================================
// 컴포넌트
// ================================================================

// 결재란 박스
interface ApprovalBoxProps {
  approver: ApproverInfo
  isLast: boolean
}

const ApprovalBox: React.FC<ApprovalBoxProps> = ({ approver, isLast }) => {
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

  return (
    <View style={isLast ? styles.approvalBoxLast : styles.approvalBox}>
      <View style={styles.approvalHeader}>
        <Text style={styles.approvalHeaderText}>{approver.role}</Text>
      </View>
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
          <Text style={styles.approvalSignText}>
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 제목 */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>휴가신청서</Text>
        </View>

        {/* 결재란 (동적 - 최대 10개) */}
        <View style={styles.approvalSection}>
          {data.approvers.slice(0, 10).map((approver, index) => (
            <ApprovalBox
              key={approver.id}
              approver={approver}
              isLast={index === Math.min(data.approvers.length, 10) - 1}
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

        {/* 신청자 정보 */}
        <View style={styles.infoSection}>
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

        {/* 보유연차 */}
        <View style={styles.leaveInfoRowFirst}>
          <View style={styles.leaveInfoLabel}>
            <Text style={styles.infoLabelText}>보유연차</Text>
          </View>
          <View style={styles.leaveInfoValue}>
            <Text style={styles.infoValueText}>{data.totalLeave}</Text>
          </View>
        </View>

        {/* 휴가기간 테이블 */}
        <View style={styles.periodTable}>
          {/* 헤더 */}
          <View style={styles.periodTableHeader}>
            <View style={styles.periodLabelCell}>
              <Text style={styles.periodCellTextBold}>휴가기간</Text>
            </View>
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
                index === periodRows.length - 1
                  ? styles.periodTableRowLast
                  : styles.periodTableRow
              }
            >
              <View style={styles.periodLabelCell}>
                {index === 0 && <Text style={styles.periodCellText}></Text>}
              </View>
              <View style={styles.periodDateCell}>
                <Text style={styles.periodCellText}>
                  {formatDateRange(period.startDate, period.endDate)}
                </Text>
              </View>
              <View style={styles.periodTypeCell}>
                <Text style={styles.periodCellText}>
                  {LeaveTypeLabelMap[period.leaveType]}
                </Text>
              </View>
              <View style={styles.periodDaysCell}>
                <Text style={styles.periodCellText}>
                  {formatDaysCount(period.days)}
                </Text>
              </View>
            </View>
          ))}

          {/* 빈 행 추가 (최소 6행 유지) */}
          {Array.from({ length: Math.max(0, 6 - periodRows.length) }).map(
            (_, index) => (
              <View key={`empty-${index}`} style={styles.periodTableRow}>
                <View style={styles.periodLabelCell} />
                <View style={styles.periodDateCell} />
                <View style={styles.periodTypeCell} />
                <View style={styles.periodDaysCell} />
              </View>
            )
          )}
        </View>

        {/* 합계 행 */}
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

        {/* 하단 - 신청 문구 및 서명 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>위와 같이 휴가를 신청합니다.</Text>
          <Text style={styles.footerDate}>{formatDateKorean(data.createdAt)}</Text>

          <View style={styles.signatureSection}>
            {/* 회사 로고 */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>MUST</Text>
              <Text style={styles.logoSubText}>COMPANY</Text>
            </View>

            {/* 신청인 서명 */}
            <View style={styles.signatureContainer}>
              <Text style={styles.signatureLabel}>신청인 :</Text>
              <View style={styles.signatureBox}>
                <Text style={{ fontSize: 8, color: '#666' }}>(인)</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default LeaveRequestPDF
