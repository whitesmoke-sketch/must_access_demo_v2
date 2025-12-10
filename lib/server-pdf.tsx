/**
 * Server-side PDF Generator
 * 서버 액션에서 PDF를 생성하기 위한 유틸리티
 * @react-pdf/renderer의 renderToBuffer 사용
 */

import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { LeaveRequestPDFData, ApproverInfo } from '@/components/pdf/types'
import {
  splitLeavePeriodByWeekend,
  formatDateRange,
  formatDaysCount,
  formatDateKorean,
} from '@/components/pdf/utils'

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

// 공통 여백 값
const PAGE_PADDING = 30

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  approvalSection: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  approvalBox: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderColor: '#000',
    marginLeft: -1,
  },
  approvalBoxFirst: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderColor: '#000',
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
  mainContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
  },
  mainContent: {
    flexDirection: 'column',
  },
  mainFooterWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 36,
  },
  infoLabelCell: {
    width: 80,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  infoValueCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  infoValueCellLast: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
  },
  infoLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoValueText: {
    fontSize: 10,
  },
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
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodTypeCell: {
    width: 80,
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
  footerSection: {
    paddingTop: 30,
    paddingBottom: 0,
    paddingHorizontal: 0,
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

// 휴가 유형 한글 레이블
const LeaveTypeLabelMap: Record<string, string> = {
  annual: '연차',
  half_day: '반차',
  half_day_am: '오전반차',
  half_day_pm: '오후반차',
  quarter_day: '반반차',
  award: '포상휴가',
  sick: '병가',
  special: '특별휴가',
}

// 결재 상태 한글 레이블
const ApprovalStatusLabelMap: Record<string, string> = {
  waiting: '대기',
  pending: '결재중',
  approved: '승인',
  rejected: '반려',
}

// 결재란 박스 컴포넌트
interface ApprovalBoxProps {
  approver: ApproverInfo
  isFirst: boolean
}

const ApprovalBox: React.FC<ApprovalBoxProps> = ({ approver, isFirst }) => {
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
    <View style={isFirst ? styles.approvalBoxFirst : styles.approvalBox}>
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

// 서버 사이드 휴가신청서 PDF 컴포넌트
interface ServerLeaveRequestPDFProps {
  data: LeaveRequestPDFData
}

const ServerLeaveRequestPDF: React.FC<ServerLeaveRequestPDFProps> = ({ data }) => {
  // 주말 기준으로 휴가 기간 분리
  const periodRows = splitLeavePeriodByWeekend(
    data.startDate,
    data.endDate,
    data.leaveType
  )

  // 참조자가 있는지 확인
  const hasCCList = data.ccList && data.ccList.length > 0

  // 6행 고정을 위한 빈 행 수 계산
  const fixedRows = 6
  const emptyRowCount = Math.max(0, fixedRows - periodRows.length)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 제목 */}
        <Text style={styles.title}>휴가신청서</Text>

        {/* 결재란 */}
        <View style={styles.approvalSection}>
          {data.approvers.map((approver, index) => (
            <ApprovalBox
              key={approver.id}
              approver={approver}
              isFirst={index === 0}
            />
          ))}
        </View>

        {/* 참조자 */}
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

        {/* 메인 컨테이너 */}
        <View style={styles.mainContainer}>
          <View style={styles.mainContent}>
            {/* 성명/소속 행 */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelCell}>
                <Text style={styles.infoLabelText}>성명</Text>
              </View>
              <View style={styles.infoValueCell}>
                <Text style={styles.infoValueText}>{data.requester.name}</Text>
              </View>
              <View style={styles.infoLabelCell}>
                <Text style={styles.infoLabelText}>소속</Text>
              </View>
              <View style={styles.infoValueCellLast}>
                <Text style={styles.infoValueText}>{data.requester.department}</Text>
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

            {/* 휴가기간 테이블 */}
            <View style={styles.periodSection}>
              <View style={styles.periodLabelColumn}>
                <Text style={styles.periodLabelText}>휴가기간</Text>
              </View>

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

                {/* 빈 행 추가 */}
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
          </View>

          {/* 하단 영역 */}
          <View style={styles.mainFooterWrapper}>
            <View style={styles.footerSection}>
              <Text style={styles.footerText}>위와 같이 휴가를 신청합니다.</Text>
              <Text style={styles.footerDate}>{formatDateKorean(data.createdAt)}</Text>

              <View style={styles.signatureSection}>
                {/* 회사 로고 */}
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
        </View>
      </Page>
    </Document>
  )
}

/**
 * 휴가신청서 PDF를 Buffer로 생성
 */
export async function generateLeaveRequestPdfBuffer(
  data: LeaveRequestPDFData
): Promise<Buffer> {
  const buffer = await renderToBuffer(<ServerLeaveRequestPDF data={data} />)
  return Buffer.from(buffer)
}

/**
 * 문서 타입에 따른 PDF Buffer 생성 (확장용)
 * 현재는 휴가신청서만 지원
 */
export async function generateDocumentPdfBuffer(
  docType: string,
  data: unknown
): Promise<Buffer | null> {
  switch (docType) {
    case 'leave':
      return generateLeaveRequestPdfBuffer(data as LeaveRequestPDFData)
    default:
      console.warn(`[PDF] 지원하지 않는 문서 타입: ${docType}`)
      return null
  }
}
