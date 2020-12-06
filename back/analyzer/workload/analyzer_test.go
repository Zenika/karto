package workload

import (
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1beta1 "k8s.io/api/networking/v1beta1"
	"karto/analyzer/workload/daemonset"
	"karto/analyzer/workload/deployment"
	"karto/analyzer/workload/ingress"
	"karto/analyzer/workload/replicaset"
	"karto/analyzer/workload/service"
	"karto/analyzer/workload/statefulset"
	"karto/testutils"
	"karto/types"
	"reflect"
	"testing"
)

func TestAnalyze(t *testing.T) {
	type args struct {
		clusterState ClusterState
	}
	type mocks struct {
		service     []mockServiceAnalyzerCall
		ingress     []mockIngressAnalyzerCall
		replicaSet  []mockReplicaSetAnalyzerCall
		statefulSet []mockStatefulSetAnalyzerCall
		daemonSet   []mockDaemonSetAnalyzerCall
		deployment  []mockDeploymentAnalyzerCall
	}
	k8sPod1 := testutils.NewPodBuilder().WithName("pod1").WithNamespace("ns").Build()
	k8sPod2 := testutils.NewPodBuilder().WithName("pod2").WithNamespace("ns").Build()
	k8sPod3 := testutils.NewPodBuilder().WithName("pod3").WithNamespace("ns").Build()
	k8sService1 := testutils.NewServiceBuilder().WithName("svc1").WithNamespace("ns").Build()
	k8sService2 := testutils.NewServiceBuilder().WithName("svc2").WithNamespace("ns").Build()
	k8sIngress1 := testutils.NewIngressBuilder().WithName("ing1").WithNamespace("ns").Build()
	k8sIngress2 := testutils.NewIngressBuilder().WithName("ing2").WithNamespace("ns").Build()
	k8sReplicaSet1 := testutils.NewReplicaSetBuilder().WithName("rs1").WithNamespace("ns").Build()
	k8sReplicaSet2 := testutils.NewReplicaSetBuilder().WithName("rs2").WithNamespace("ns").Build()
	k8sStatefulSet1 := testutils.NewStatefulSetBuilder().WithName("rs1").WithNamespace("ns").Build()
	k8sStatefulSet2 := testutils.NewStatefulSetBuilder().WithName("rs2").WithNamespace("ns").Build()
	k8sDaemonSet1 := testutils.NewDaemonSetBuilder().WithName("rs1").WithNamespace("ns").Build()
	k8sDaemonSet2 := testutils.NewDaemonSetBuilder().WithName("rs2").WithNamespace("ns").Build()
	k8sDeployment1 := testutils.NewDeploymentBuilder().WithName("deploy1").WithNamespace("ns").Build()
	k8sDeployment2 := testutils.NewDeploymentBuilder().WithName("deploy2").WithNamespace("ns").Build()
	podRef1 := types.PodRef{Name: k8sPod1.Name, Namespace: k8sPod1.Namespace}
	podRef2 := types.PodRef{Name: k8sPod2.Name, Namespace: k8sPod2.Namespace}
	podRef3 := types.PodRef{Name: k8sPod3.Name, Namespace: k8sPod3.Namespace}
	service1 := &types.Service{Name: k8sService1.Name, Namespace: k8sService1.Namespace,
		TargetPods: []types.PodRef{podRef1}}
	service2 := &types.Service{Name: k8sService2.Name, Namespace: k8sService2.Namespace,
		TargetPods: []types.PodRef{podRef2, podRef3}}
	serviceRef1 := types.ServiceRef{Name: k8sService1.Name, Namespace: k8sService1.Namespace}
	serviceRef2 := types.ServiceRef{Name: k8sService2.Name, Namespace: k8sService2.Namespace}
	ingress1 := &types.Ingress{Name: k8sIngress1.Name, Namespace: k8sIngress1.Namespace,
		TargetServices: []types.ServiceRef{serviceRef1}}
	ingress2 := &types.Ingress{Name: k8sIngress2.Name, Namespace: k8sIngress2.Namespace,
		TargetServices: []types.ServiceRef{serviceRef2}}
	replicaSet1 := &types.ReplicaSet{Name: k8sReplicaSet1.Name, Namespace: k8sReplicaSet1.Namespace,
		TargetPods: []types.PodRef{podRef1, podRef2}}
	replicaSet2 := &types.ReplicaSet{Name: k8sReplicaSet2.Name, Namespace: k8sReplicaSet2.Namespace,
		TargetPods: []types.PodRef{podRef3}}
	statefulSet1 := &types.StatefulSet{Name: k8sStatefulSet1.Name, Namespace: k8sStatefulSet1.Namespace,
		TargetPods: []types.PodRef{podRef1, podRef2}}
	statefulSet2 := &types.StatefulSet{Name: k8sStatefulSet2.Name, Namespace: k8sStatefulSet2.Namespace,
		TargetPods: []types.PodRef{podRef3}}
	daemonSet1 := &types.DaemonSet{Name: k8sDaemonSet1.Name, Namespace: k8sDaemonSet1.Namespace,
		TargetPods: []types.PodRef{podRef1, podRef2}}
	daemonSet2 := &types.DaemonSet{Name: k8sDaemonSet2.Name, Namespace: k8sDaemonSet2.Namespace,
		TargetPods: []types.PodRef{podRef3}}
	replicaSetRef1 := types.ReplicaSetRef{Name: k8sReplicaSet1.Name, Namespace: k8sReplicaSet1.Namespace}
	replicaSetRef2 := types.ReplicaSetRef{Name: k8sReplicaSet2.Name, Namespace: k8sReplicaSet2.Namespace}
	deployment1 := &types.Deployment{Name: k8sDeployment1.Name, Namespace: k8sDeployment1.Namespace,
		TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef1}}
	deployment2 := &types.Deployment{Name: k8sDeployment2.Name, Namespace: k8sDeployment2.Namespace,
		TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef2}}
	tests := []struct {
		name                   string
		mocks                  mocks
		args                   args
		expectedAnalysisResult AnalysisResult
	}{
		{
			name: "delegates to sub-analyzers and merges results",
			mocks: mocks{
				service: []mockServiceAnalyzerCall{
					{
						args: mockServiceAnalyzerCallArgs{
							service: k8sService1,
							pods:    []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
						},
						returnValue: service1,
					},
					{
						args: mockServiceAnalyzerCallArgs{
							service: k8sService2,
							pods:    []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
						},
						returnValue: service2,
					},
				},
				ingress: []mockIngressAnalyzerCall{
					{
						args: mockIngressAnalyzerCallArgs{
							ingress:  k8sIngress1,
							services: []*corev1.Service{k8sService1, k8sService2},
						},
						returnValue: ingress1,
					},
					{
						args: mockIngressAnalyzerCallArgs{
							ingress:  k8sIngress2,
							services: []*corev1.Service{k8sService1, k8sService2},
						},
						returnValue: ingress2,
					},
				},
				replicaSet: []mockReplicaSetAnalyzerCall{
					{
						args: mockReplicaSetAnalyzerCallArgs{
							replicaSet: k8sReplicaSet1,
							pods:       []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
						},
						returnValue: replicaSet1,
					},
					{
						args: mockReplicaSetAnalyzerCallArgs{
							replicaSet: k8sReplicaSet2,
							pods:       []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
						},
						returnValue: replicaSet2,
					},
				},
				statefulSet: []mockStatefulSetAnalyzerCall{
					{
						args: mockStatefulSetAnalyzerCallArgs{
							statefulSet: k8sStatefulSet1,
							pods:        []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
						},
						returnValue: statefulSet1,
					},
					{
						args: mockStatefulSetAnalyzerCallArgs{
							statefulSet: k8sStatefulSet2,
							pods:        []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
						},
						returnValue: statefulSet2,
					},
				},
				daemonSet: []mockDaemonSetAnalyzerCall{
					{
						args: mockDaemonSetAnalyzerCallArgs{
							daemonSet: k8sDaemonSet1,
							pods:      []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
						},
						returnValue: daemonSet1,
					},
					{
						args: mockDaemonSetAnalyzerCallArgs{
							daemonSet: k8sDaemonSet2,
							pods:      []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
						},
						returnValue: daemonSet2,
					},
				},
				deployment: []mockDeploymentAnalyzerCall{
					{
						args: mockDeploymentAnalyzerCallArgs{
							deployment:  k8sDeployment1,
							replicaSets: []*appsv1.ReplicaSet{k8sReplicaSet1, k8sReplicaSet2},
						},
						returnValue: deployment1,
					},
					{
						args: mockDeploymentAnalyzerCallArgs{
							deployment:  k8sDeployment2,
							replicaSets: []*appsv1.ReplicaSet{k8sReplicaSet1, k8sReplicaSet2},
						},
						returnValue: deployment2,
					},
				},
			},
			args: args{
				clusterState: ClusterState{
					Pods:         []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
					Services:     []*corev1.Service{k8sService1, k8sService2},
					Ingresses:    []*networkingv1beta1.Ingress{k8sIngress1, k8sIngress2},
					ReplicaSets:  []*appsv1.ReplicaSet{k8sReplicaSet1, k8sReplicaSet2},
					StatefulSets: []*appsv1.StatefulSet{k8sStatefulSet1, k8sStatefulSet2},
					DaemonSets:   []*appsv1.DaemonSet{k8sDaemonSet1, k8sDaemonSet2},
					Deployments:  []*appsv1.Deployment{k8sDeployment1, k8sDeployment2},
				},
			},
			expectedAnalysisResult: AnalysisResult{
				Services:     []*types.Service{service1, service2},
				Ingresses:    []*types.Ingress{ingress1, ingress2},
				ReplicaSets:  []*types.ReplicaSet{replicaSet1, replicaSet2},
				StatefulSets: []*types.StatefulSet{statefulSet1, statefulSet2},
				DaemonSets:   []*types.DaemonSet{daemonSet1, daemonSet2},
				Deployments:  []*types.Deployment{deployment1, deployment2},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			serviceAnalyzer := createMockServiceAnalyzer(t, tt.mocks.service)
			ingressAnalyzer := createMockIngressAnalyzer(t, tt.mocks.ingress)
			replicaSetAnalyzer := createMockReplicaSetAnalyzer(t, tt.mocks.replicaSet)
			statefulSetAnalyzer := createMockStatefulSetAnalyzer(t, tt.mocks.statefulSet)
			daemonSetAnalyzer := createMockDaemonSetAnalyzer(t, tt.mocks.daemonSet)
			deploymentAnalyzer := createMockDeploymentAnalyzer(t, tt.mocks.deployment)
			analyzer := NewAnalyzer(serviceAnalyzer, ingressAnalyzer, replicaSetAnalyzer, statefulSetAnalyzer,
				daemonSetAnalyzer, deploymentAnalyzer)
			analysisResult := analyzer.Analyze(tt.args.clusterState)
			if diff := cmp.Diff(tt.expectedAnalysisResult, analysisResult); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

type mockServiceAnalyzerCallArgs struct {
	service *corev1.Service
	pods    []*corev1.Pod
}

type mockServiceAnalyzerCall struct {
	args        mockServiceAnalyzerCallArgs
	returnValue *types.Service
}

type mockServiceAnalyzer struct {
	t     *testing.T
	calls []mockServiceAnalyzerCall
}

func (mock mockServiceAnalyzer) Analyze(service *corev1.Service, pods []*corev1.Pod) *types.Service {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.service, service) &&
			reflect.DeepEqual(call.args.pods, pods) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockServiceAnalyzer was called with unexpected arguments:\n\tservice: %s\n\tpods: %s\n",
		service, pods)
	return nil
}

func createMockServiceAnalyzer(t *testing.T, calls []mockServiceAnalyzerCall) service.Analyzer {
	return mockServiceAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockIngressAnalyzerCallArgs struct {
	ingress  *networkingv1beta1.Ingress
	services []*corev1.Service
}

type mockIngressAnalyzerCall struct {
	args        mockIngressAnalyzerCallArgs
	returnValue *types.Ingress
}

type mockIngressAnalyzer struct {
	t     *testing.T
	calls []mockIngressAnalyzerCall
}

func (mock mockIngressAnalyzer) Analyze(ingress *networkingv1beta1.Ingress, services []*corev1.Service) *types.Ingress {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.ingress, ingress) &&
			reflect.DeepEqual(call.args.services, services) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockIngressAnalyzer was called with unexpected arguments:\n\tingress: %s\n\tservices: %s\n",
		ingress, services)
	return nil
}

func createMockIngressAnalyzer(t *testing.T, calls []mockIngressAnalyzerCall) ingress.Analyzer {
	return mockIngressAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockReplicaSetAnalyzerCallArgs struct {
	replicaSet *appsv1.ReplicaSet
	pods       []*corev1.Pod
}

type mockReplicaSetAnalyzerCall struct {
	args        mockReplicaSetAnalyzerCallArgs
	returnValue *types.ReplicaSet
}

type mockReplicaSetAnalyzer struct {
	t     *testing.T
	calls []mockReplicaSetAnalyzerCall
}

func (mock mockReplicaSetAnalyzer) Analyze(replicaSet *appsv1.ReplicaSet, pods []*corev1.Pod) *types.ReplicaSet {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.replicaSet, replicaSet) &&
			reflect.DeepEqual(call.args.pods, pods) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockReplicaSetAnalyzer was called with unexpected arguments:\n\treplicaSet: %s\n\tpods: %s\n",
		replicaSet, pods)
	return nil
}

func createMockReplicaSetAnalyzer(t *testing.T, calls []mockReplicaSetAnalyzerCall) replicaset.Analyzer {
	return mockReplicaSetAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockStatefulSetAnalyzerCallArgs struct {
	statefulSet *appsv1.StatefulSet
	pods        []*corev1.Pod
}

type mockStatefulSetAnalyzerCall struct {
	args        mockStatefulSetAnalyzerCallArgs
	returnValue *types.StatefulSet
}

type mockStatefulSetAnalyzer struct {
	t     *testing.T
	calls []mockStatefulSetAnalyzerCall
}

func (mock mockStatefulSetAnalyzer) Analyze(statefulSet *appsv1.StatefulSet, pods []*corev1.Pod) *types.StatefulSet {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.statefulSet, statefulSet) &&
			reflect.DeepEqual(call.args.pods, pods) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockStatefulSetAnalyzer was called with unexpected arguments:\n\tstatefulSet: %s\n"+
		"\tpods: %s\n", statefulSet, pods)
	return nil
}

func createMockStatefulSetAnalyzer(t *testing.T, calls []mockStatefulSetAnalyzerCall) statefulset.Analyzer {
	return mockStatefulSetAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockDaemonSetAnalyzerCallArgs struct {
	daemonSet *appsv1.DaemonSet
	pods      []*corev1.Pod
}

type mockDaemonSetAnalyzerCall struct {
	args        mockDaemonSetAnalyzerCallArgs
	returnValue *types.DaemonSet
}

type mockDaemonSetAnalyzer struct {
	t     *testing.T
	calls []mockDaemonSetAnalyzerCall
}

func (mock mockDaemonSetAnalyzer) Analyze(daemonSet *appsv1.DaemonSet, pods []*corev1.Pod) *types.DaemonSet {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.daemonSet, daemonSet) &&
			reflect.DeepEqual(call.args.pods, pods) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockDaemonSetAnalyzer was called with unexpected arguments:\n\tdaemonSet: %s\n\tpods: %s\n",
		daemonSet, pods)
	return nil
}

func createMockDaemonSetAnalyzer(t *testing.T, calls []mockDaemonSetAnalyzerCall) daemonset.Analyzer {
	return mockDaemonSetAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockDeploymentAnalyzerCallArgs struct {
	deployment  *appsv1.Deployment
	replicaSets []*appsv1.ReplicaSet
}

type mockDeploymentAnalyzerCall struct {
	args        mockDeploymentAnalyzerCallArgs
	returnValue *types.Deployment
}

type mockDeploymentAnalyzer struct {
	t     *testing.T
	calls []mockDeploymentAnalyzerCall
}

func (mock mockDeploymentAnalyzer) Analyze(deployment *appsv1.Deployment,
	replicaSets []*appsv1.ReplicaSet) *types.Deployment {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.deployment, deployment) &&
			reflect.DeepEqual(call.args.replicaSets, replicaSets) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockDeploymentAnalyzer was called with unexpected arguments:\n\tdeployment: %s\n"+
		"\treplicaSets: %s\n", deployment, replicaSets)
	return nil
}

func createMockDeploymentAnalyzer(t *testing.T, calls []mockDeploymentAnalyzerCall) deployment.Analyzer {
	return mockDeploymentAnalyzer{
		t:     t,
		calls: calls,
	}
}
