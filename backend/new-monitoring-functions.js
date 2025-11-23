// Append these to dist/controllers/monitoring.admin.controller.js

const getResourceMetrics = async (req, res) => {
  try {
    const latestMetrics = await sequelize.query(
      `SELECT * FROM resource_metrics ORDER BY timestamp DESC LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (latestMetrics.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No resource metrics available yet'
      });
    }

    const metrics = latestMetrics[0];

    const trends = await sequelize.query(
      `SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour,
        AVG(disk_used_percent) as avg_disk,
        AVG(backend_memory_percent) as avg_backend_mem,
        AVG(worker_memory_percent) as avg_worker_mem,
        AVG(redis_memory_percent) as avg_redis_mem,
        AVG(mysql_memory_percent) as avg_mysql_mem,
        AVG(frontend_memory_percent) as avg_frontend_mem,
        AVG(partners_memory_percent) as avg_partners_mem
      FROM resource_metrics
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY hour
      ORDER BY hour ASC`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        current: {
          disk: {
            used_percent: parseFloat(metrics.disk_used_percent) || 0,
            used_gb: parseFloat(metrics.disk_used_gb) || 0,
            total_gb: parseFloat(metrics.disk_total_gb) || 0,
            warning_threshold: 85,
            critical_threshold: 95
          },
          memory: {
            backend: parseFloat(metrics.backend_memory_percent) || 0,
            worker: parseFloat(metrics.worker_memory_percent) || 0,
            redis: parseFloat(metrics.redis_memory_percent) || 0,
            mysql: parseFloat(metrics.mysql_memory_percent) || 0,
            frontend: parseFloat(metrics.frontend_memory_percent) || 0,
            partners: parseFloat(metrics.partners_memory_percent) || 0,
            warning_threshold: 80
          },
          redis: {
            memory_percent: parseFloat(metrics.redis_memory_percent) || 0,
            keys: parseInt(metrics.redis_keys) || 0,
            hit_rate: parseFloat(metrics.redis_hit_rate) || 0
          }
        },
        trends: trends,
        timestamp: metrics.timestamp
      }
    });
  } catch (error) {
    console.error('Resource metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getRemediationLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, action_type, status, target } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (action_type) {
      whereClause += ' AND action_type = ?';
      params.push(action_type);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (target) {
      whereClause += ' AND target LIKE ?';
      params.push(`%${target}%`);
    }

    const offset = (Number(page) - 1) * Number(limit);

    const logs = await sequelize.query(
      `SELECT * FROM remediation_log
       WHERE ${whereClause}
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [...params, Number(limit), offset],
        type: QueryTypes.SELECT
      }
    );

    const totalCount = await sequelize.query(
      `SELECT COUNT(*) as count FROM remediation_log WHERE ${whereClause}`,
      {
        replacements: params,
        type: QueryTypes.SELECT
      }
    );

    const stats = await sequelize.query(
      `SELECT
        COUNT(*) as total_actions,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(duration_seconds) as avg_duration,
        action_type,
        COUNT(*) as count
      FROM remediation_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY action_type`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: logs,
      statistics: stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Remediation log error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getResourceMetrics = getResourceMetrics;
exports.getRemediationLog = getRemediationLog;
