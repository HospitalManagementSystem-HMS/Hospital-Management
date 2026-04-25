const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const k8sDir = path.join(rootDir, 'k8s_new');
const helmDir = path.join(rootDir, 'helm');

// Helper to write files
function writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content.trim() + '\n');
}

const services = [
    { name: 'frontend', port: 3000, type: 'NodePort', isNodePort: true, nodePort: 30080 },
    { name: 'api-gateway', port: 4000, type: 'NodePort', isNodePort: true, nodePort: 30081 }, // Assuming 30081 for gateway
    { name: 'auth-service', port: 5000, type: 'ClusterIP' },
    { name: 'user-service', port: 5001, type: 'ClusterIP' },
    { name: 'appointment-service', port: 5002, type: 'ClusterIP' },
    { name: 'notification-service', port: 5004, type: 'ClusterIP' }
];

const envs = ['dev', 'prod'];

// --- 1. K8S MANIFESTS ---

// 1.1 Common
writeFile(path.join(k8sDir, 'common', 'namespace-dev.yaml'), `
apiVersion: v1
kind: Namespace
metadata:
  name: hms-dev
  labels:
    environment: dev
`);

writeFile(path.join(k8sDir, 'common', 'namespace-prod.yaml'), `
apiVersion: v1
kind: Namespace
metadata:
  name: hms-prod
  labels:
    environment: prod
`);

writeFile(path.join(k8sDir, 'common', 'storageclass.yaml'), `
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: duni-sc
provisioner: nfs.csi.k8s.io
parameters:
  server: 10.0.1.140
  share: /var/nfs/general/hospital
reclaimPolicy: Retain
volumeBindingMode: Immediate
`);

writeFile(path.join(k8sDir, 'common', 'gateway.yaml'), `
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: hms-gateway
  namespace: hms-dev # Apply separately per namespace or use gateway-class
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
`);

writeFile(path.join(k8sDir, 'common', 'httproute.yaml'), `
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: hms-routes
spec:
  parentRefs:
  - name: hms-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/auth
    backendRefs:
    - name: auth-service
      port: 5000
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
    backendRefs:
    - name: user-service
      port: 5001
  - matches:
    - path:
        type: PathPrefix
        value: /api/appointments
    backendRefs:
    - name: appointment-service
      port: 5002
  - matches:
    - path:
        type: PathPrefix
        value: /api/notifications
    backendRefs:
    - name: notification-service
      port: 5004
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend
      port: 3000
`);

// 1.2 MongoDB
writeFile(path.join(k8sDir, 'common', 'mongodb', 'statefulset.yaml'), `
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  serviceName: "mongodb-headless"
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7.0
        ports:
        - containerPort: 27017
          name: mongodb
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          value: "admin123"
        volumeMounts:
        - name: mongo-data
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: mongo-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "duni-sc"
      resources:
        requests:
          storage: 10Gi
`);

writeFile(path.join(k8sDir, 'common', 'mongodb', 'service.yaml'), `
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
`);

// 1.3 Services
services.forEach(svc => {
    const svcDir = path.join(k8sDir, 'services', svc.name);
    
    // ConfigMap
    writeFile(path.join(svcDir, 'configmap.yaml'), `
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${svc.name}-config
data:
  PORT: "${svc.port}"
  SERVICE_NAME: "${svc.name}"
${svc.name !== 'frontend' ? `  MONGO_URI: "mongodb://admin:admin123@mongodb-headless:27017/?authSource=admin"
  AUTH_SERVICE_URL: "http://auth-service:5000"
  USER_SERVICE_URL: "http://user-service:5001"
  APPOINTMENT_SERVICE_URL: "http://appointment-service:5002"
  NOTIFICATION_SERVICE_URL: "http://notification-service:5004"
  API_GATEWAY_URL: "http://api-gateway:4000"` : ''}
`);

    // Secret
    writeFile(path.join(svcDir, 'secret.yaml'), `
apiVersion: v1
kind: Secret
metadata:
  name: ${svc.name}-secret
type: Opaque
stringData:
  JWT_SECRET: "super_secure_jwt_secret_123_change_me_in_prod"
  INTERNAL_API_KEY: "dev_internal_key_change_me_in_prod"
`);

    // Deployment
    writeFile(path.join(svcDir, 'deployment.yaml'), `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${svc.name}
  labels:
    app: ${svc.name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${svc.name}
  template:
    metadata:
      labels:
        app: ${svc.name}
    spec:
      containers:
      - name: ${svc.name}
        image: suryaa112003/${svc.name}:latest
        imagePullPolicy: Always
        ports:
        - containerPort: ${svc.port}
        envFrom:
        - configMapRef:
            name: ${svc.name}-config
        - secretRef:
            name: ${svc.name}-secret
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        readinessProbe:
          httpGet:
            path: /health
            port: ${svc.port}
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: ${svc.port}
          initialDelaySeconds: 15
          periodSeconds: 10
`);

    // Service
    writeFile(path.join(svcDir, 'service.yaml'), `
apiVersion: v1
kind: Service
metadata:
  name: ${svc.name}
spec:
  type: ${svc.type}
  selector:
    app: ${svc.name}
  ports:
  - port: ${svc.port}
    targetPort: ${svc.port}
${svc.isNodePort ? `    nodePort: ${svc.nodePort}` : ''}
`);
});

// --- 2. HELM CHARTS ---

function generateHelmChart(chartName, dir, isCommon = false, svcConfig = null) {
    writeFile(path.join(dir, 'Chart.yaml'), `
apiVersion: v2
name: ${chartName}
description: A Helm chart for ${chartName}
type: application
version: 0.1.0
appVersion: "1.0.0"
`);

    if (isCommon) {
        writeFile(path.join(dir, 'values-dev.yaml'), `
namespace: hms-dev
environment: dev
mongodb:
  storage: 10Gi
  storageClass: duni-sc
`);
        writeFile(path.join(dir, 'values-prod.yaml'), `
namespace: hms-prod
environment: prod
mongodb:
  storage: 50Gi
  storageClass: duni-sc
`);
        // templates
        writeFile(path.join(dir, 'templates', 'namespace.yaml'), `
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
  labels:
    environment: {{ .Values.environment }}
`);
        writeFile(path.join(dir, 'templates', 'mongodb.yaml'), `
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: {{ .Values.namespace }}
spec:
  serviceName: "mongodb-headless"
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7.0
        ports:
        - containerPort: 27017
          name: mongodb
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          value: "admin123"
        volumeMounts:
        - name: mongo-data
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: mongo-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: {{ .Values.mongodb.storageClass | quote }}
      resources:
        requests:
          storage: {{ .Values.mongodb.storage }}
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
  namespace: {{ .Values.namespace }}
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
`);
        writeFile(path.join(dir, 'templates', 'gateway.yaml'), `
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: hms-gateway
  namespace: {{ .Values.namespace }}
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
`);
        writeFile(path.join(dir, 'templates', 'httproute.yaml'), `
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: hms-routes
  namespace: {{ .Values.namespace }}
spec:
  parentRefs:
  - name: hms-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/auth
    backendRefs:
    - name: auth-service
      port: 5000
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
    backendRefs:
    - name: user-service
      port: 5001
  - matches:
    - path:
        type: PathPrefix
        value: /api/appointments
    backendRefs:
    - name: appointment-service
      port: 5002
  - matches:
    - path:
        type: PathPrefix
        value: /api/notifications
    backendRefs:
    - name: notification-service
      port: 5004
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend
      port: 3000
`);
    } else {
        // Services chart
        writeFile(path.join(dir, 'values-dev.yaml'), `
namespace: hms-dev
replicaCount: 1
image:
  repository: suryaa112003/${svcConfig.name}
  tag: latest
  pullPolicy: Always
service:
  type: ${svcConfig.type}
  port: ${svcConfig.port}
  ${svcConfig.isNodePort ? `nodePort: ${svcConfig.nodePort}` : ''}
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
env:
  PORT: "${svcConfig.port}"
  SERVICE_NAME: "${svcConfig.name}"
secrets:
  JWT_SECRET: "dev_secret_123"
  INTERNAL_API_KEY: "dev_internal_key"
`);
        writeFile(path.join(dir, 'values-prod.yaml'), `
namespace: hms-prod
replicaCount: 2
image:
  repository: suryaa112003/${svcConfig.name}
  tag: stable
  pullPolicy: Always
service:
  type: ${svcConfig.type}
  port: ${svcConfig.port}
  ${svcConfig.isNodePort ? `nodePort: ${svcConfig.nodePort}` : ''}
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
env:
  PORT: "${svcConfig.port}"
  SERVICE_NAME: "${svcConfig.name}"
secrets:
  JWT_SECRET: "prod_secret_123"
  INTERNAL_API_KEY: "prod_internal_key"
`);
        // templates
        writeFile(path.join(dir, 'templates', 'configmap.yaml'), `
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "${svcConfig.name}.fullname" . }}-config
  namespace: {{ .Values.namespace }}
data:
  {{- range $key, $val := .Values.env }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
${svcConfig.name !== 'frontend' ? `  MONGO_URI: "mongodb://admin:admin123@mongodb-headless:27017/?authSource=admin"
  AUTH_SERVICE_URL: "http://auth-service:5000"
  USER_SERVICE_URL: "http://user-service:5001"
  APPOINTMENT_SERVICE_URL: "http://appointment-service:5002"
  NOTIFICATION_SERVICE_URL: "http://notification-service:5004"
  API_GATEWAY_URL: "http://api-gateway:4000"` : ''}
`);
        writeFile(path.join(dir, 'templates', 'secret.yaml'), `
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "${svcConfig.name}.fullname" . }}-secret
  namespace: {{ .Values.namespace }}
type: Opaque
stringData:
  {{- range $key, $val := .Values.secrets }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
`);
        writeFile(path.join(dir, 'templates', 'deployment.yaml'), `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${svcConfig.name}.fullname" . }}
  namespace: {{ .Values.namespace }}
  labels:
    app: {{ include "${svcConfig.name}.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "${svcConfig.name}.fullname" . }}
  template:
    metadata:
      labels:
        app: {{ include "${svcConfig.name}.fullname" . }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: TCP
          envFrom:
            - configMapRef:
                name: {{ include "${svcConfig.name}.fullname" . }}-config
            - secretRef:
                name: {{ include "${svcConfig.name}.fullname" . }}-secret
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 15
            periodSeconds: 10
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
`);
        writeFile(path.join(dir, 'templates', 'service.yaml'), `
apiVersion: v1
kind: Service
metadata:
  name: {{ include "${svcConfig.name}.fullname" . }}
  namespace: {{ .Values.namespace }}
spec:
  type: {{ .Values.service.type }}
  selector:
    app: {{ include "${svcConfig.name}.fullname" . }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      {{- if .Values.service.nodePort }}
      nodePort: {{ .Values.service.nodePort }}
      {{- end }}
`);
        writeFile(path.join(dir, 'templates', '_helpers.tpl'), `
{{- define "${svcConfig.name}.fullname" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}
`);
    }
}

// Generate Common Helm Chart
generateHelmChart('common', path.join(helmDir, 'common'), true);

// Generate Services Helm Charts
services.forEach(svc => {
    generateHelmChart(svc.name, path.join(helmDir, 'services', svc.name), false, svc);
});

console.log("All Kubernetes manifests and Helm charts generated successfully.");
