import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Linking, Alert} from 'react-native';
import {Screen, Header, Card, StatCard, Badge, Button, Text, Skeleton} from '@/components/ui';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {useTheme} from '@/theme';
import * as dashboardService from '@/services/dashboard.service';
import {API_BASE_URL} from '@/config/env';
import type {DashboardStats} from '@/types';

export default function ReportsScreen() {
  const {colors, spacing} = useTheme();
  const desktop = useDesktopLayout();
  const [loading, setLoading] = useState(true);
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [zoneStats, setZoneStats] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [dash, dept, zones] = await Promise.all([
          dashboardService.getDashboard(),
          dashboardService.getDepartmentAnalytics(),
          dashboardService.getZoneAnalytics(),
        ]);
        
        setDashboard(dash);
        
        // Defensive mapping for analytics objects
        setDeptStats(Array.isArray(dept) ? dept : (dept?.data && Array.isArray(dept.data) ? dept.data : Object.values(dept || {})));
        setZoneStats(Array.isArray(zones) ? zones : (zones?.data && Array.isArray(zones.data) ? zones.data : Object.values(zones || {})));
      } catch (err) {
        Alert.alert('Error', 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleExport = (type: 'csv' | 'excel') => {
    const url = `${API_BASE_URL}/export/complaints/${type}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open export URL');
      }
    });
  };

  const renderAnalyticsCard = (item: any, index: number) => {
    const name = item?.name || item?.department?.name || item?.zone?.name || item?.id || item?._id || `Entity ${index + 1}`;
    const code = item?.code || item?.department?.code || item?.zone?.code || '';
    const total = item?.totalComplaints ?? item?.total ?? item?.count ?? 0;
    const resolved = item?.resolvedComplaints ?? item?.resolved ?? 0;
    
    return (
      <Card key={index} style={[styles.dataCard, {marginBottom: spacing.md}]}>
        <View style={styles.cardHeader}>
          <Text variant="h3">{String(name)}</Text>
          {!!code && <Badge label={String(code)} variant="default" />}
        </View>
        <View style={[styles.cardStats, {marginTop: spacing.md}]}>
          <View style={styles.statItem}>
            <Text variant="label" muted>Total</Text>
            <Text variant="h2">{total}</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="label" muted>Resolved</Text>
            <Text variant="h2">{resolved}</Text>
          </View>
          {total > 0 && (
            <View style={styles.statItem}>
              <Text variant="label" muted>Rate</Text>
              <Text variant="h2">{Math.round((resolved / total) * 100)}%</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <Screen scroll>
        <Header panel title="Reports" subtitle="Export & analytics summary" />
        <View style={{padding: spacing.lg}}>
          <View style={[styles.statGrid, {marginBottom: spacing.xl, gap: spacing.sm}]}>
            <View style={styles.statCardContainer}><Skeleton height={100} /></View>
            <View style={styles.statCardContainer}><Skeleton height={100} /></View>
            <View style={styles.statCardContainer}><Skeleton height={100} /></View>
          </View>
          <Skeleton height={30} width={150} style={{marginBottom: spacing.md}} />
          <Skeleton height={120} style={{marginBottom: spacing.md}} />
          <Skeleton height={120} style={{marginBottom: spacing.md}} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header panel title="Reports" subtitle="Export & analytics summary" />
      <View style={{padding: spacing.lg, paddingBottom: spacing.xxxl}}>
        
        {/* Summary Stats */}
        <View style={[styles.statGrid, {marginBottom: spacing.xl, gap: spacing.sm}]}>
          <View style={styles.statCardContainer}>
            <StatCard 
              label="Complaints" 
              value={dashboard?.totalComplaints?.toString() || '0'} 
              icon="file-text"
              color={colors.primary}
            />
          </View>
          <View style={styles.statCardContainer}>
            <StatCard 
              label="Departments" 
              value={deptStats.length.toString()} 
              icon="building"
              color={colors.secondary}
            />
          </View>
          <View style={styles.statCardContainer}>
            <StatCard 
              label="Zones" 
              value={zoneStats.length.toString()} 
              icon="map"
              color={colors.warning}
            />
          </View>
        </View>

        <View style={desktop ? {flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start'} : undefined}>
          {deptStats.length > 0 ? (
            <View style={{flex: 1, minWidth: 0}}>
              <Text variant="h2" style={{marginBottom: spacing.md}}>Department Performance</Text>
              {deptStats.map(renderAnalyticsCard)}
            </View>
          ) : null}
          {zoneStats.length > 0 ? (
            <View style={{flex: 1, minWidth: 0}}>
              <Text variant="h2" style={{marginBottom: spacing.md, marginTop: desktop ? 0 : spacing.md}}>Zone Analytics</Text>
              {zoneStats.map(renderAnalyticsCard)}
            </View>
          ) : null}
        </View>

        {/* Export Options */}
        <Text variant="h2" style={{marginBottom: spacing.md, marginTop: spacing.lg}}>Export Data</Text>
        <Card>
          <Text variant="body" muted style={{marginBottom: spacing.lg}}>
            Download full complaint reports and analytics data for offline viewing.
          </Text>
          <View style={[styles.actionRow, {gap: spacing.md}]}>
            <View style={styles.flex1}>
              <Button 
                title="Export CSV" 
                variant="outline"
                onPress={() => handleExport('csv')}
                icon="file-text"
              />
            </View>
            <View style={styles.flex1}>
              <Button 
                title="Export Excel" 
                onPress={() => handleExport('excel')}
                icon="file-spreadsheet"
              />
            </View>
          </View>
        </Card>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCardContainer: {
    flex: 1,
    minWidth: '30%',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  dataCard: {},
});
