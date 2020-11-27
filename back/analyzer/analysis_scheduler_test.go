package analyzer

import (
	"fmt"
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/pod"
	"karto/analyzer/traffic"
	"karto/analyzer/workload"
	"karto/testutils"
	"karto/types"
	"reflect"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		clusterState types.ClusterState
	}
	type mocks struct {
		pods     []mockPodAnalyzerCall
		traffic  []mockTrafficAnalyzerCall
		workload []mockWorkloadAnalyzerCall
	}
	k8sNamespace := testutils.NewNamespaceBuilder().WithName("ns").Build()
	k8sPod1 := testutils.NewPodBuilder().WithName("pod1").WithNamespace("ns").
		WithLabel("k1", "v1").Build()
	k8sPod2 := testutils.NewPodBuilder().WithName("pod2").WithNamespace("ns").
		WithLabel("k1", "v2").Build()
	k8sNetworkPolicy1 := testutils.NewNetworkPolicyBuilder().WithName("netPol1").
		WithNamespace("ns").Build()
	k8sNetworkPolicy2 := testutils.NewNetworkPolicyBuilder().WithName("netPol2").
		WithNamespace("ns").Build()
	k8sService1 := testutils.NewServiceBuilder().WithName("svc1").WithNamespace("ns").Build()
	k8sService2 := testutils.NewServiceBuilder().WithName("svc2").WithNamespace("ns").Build()
	k8sReplicaSet1 := testutils.NewReplicaSetBuilder().WithName("rs1").WithNamespace("ns").Build()
	k8sReplicaSet2 := testutils.NewReplicaSetBuilder().WithName("rs2").WithNamespace("ns").Build()
	k8sStatefulSet1 := testutils.NewStatefulSetBuilder().WithName("rs1").WithNamespace("ns").Build()
	k8sStatefulSet2 := testutils.NewStatefulSetBuilder().WithName("rs2").WithNamespace("ns").Build()
	k8sDaemonSet1 := testutils.NewDaemonSetBuilder().WithName("rs1").WithNamespace("ns").Build()
	k8sDaemonSet2 := testutils.NewDaemonSetBuilder().WithName("rs2").WithNamespace("ns").Build()
	k8sDeployment1 := testutils.NewDeploymentBuilder().WithName("deploy1").WithNamespace("ns").Build()
	k8sDeployment2 := testutils.NewDeploymentBuilder().WithName("deploy2").WithNamespace("ns").Build()
	pod1 := &types.Pod{Name: k8sPod1.Name, Namespace: k8sPod1.Namespace, Labels: k8sPod1.Labels}
	pod2 := &types.Pod{Name: k8sPod2.Name, Namespace: k8sPod2.Namespace, Labels: k8sPod2.Labels}
	podRef1 := types.PodRef{Name: k8sPod1.Name, Namespace: k8sPod1.Namespace}
	podRef2 := types.PodRef{Name: k8sPod2.Name, Namespace: k8sPod2.Namespace}
	podIsolation1 := &types.PodIsolation{Pod: podRef1, IsIngressIsolated: false, IsEgressIsolated: false}
	podIsolation2 := &types.PodIsolation{Pod: podRef2, IsIngressIsolated: false, IsEgressIsolated: false}
	networkPolicy1 := types.NetworkPolicy{Name: k8sNetworkPolicy1.Name, Namespace: k8sNetworkPolicy1.Namespace,
		Labels: k8sNetworkPolicy1.Labels}
	networkPolicy2 := types.NetworkPolicy{Name: k8sNetworkPolicy2.Name, Namespace: k8sNetworkPolicy2.Namespace,
		Labels: k8sNetworkPolicy2.Labels}
	allowedRoute := &types.AllowedRoute{SourcePod: podRef1, EgressPolicies: []types.NetworkPolicy{networkPolicy1},
		TargetPod: podRef2, IngressPolicies: []types.NetworkPolicy{networkPolicy2}, Ports: []int32{80, 443}}
	service1 := &types.Service{Name: k8sService1.Name, Namespace: k8sService1.Namespace,
		TargetPods: []types.PodRef{podRef1}}
	service2 := &types.Service{Name: k8sService2.Name, Namespace: k8sService2.Namespace,
		TargetPods: []types.PodRef{podRef2}}
	replicaSet1 := &types.ReplicaSet{Name: k8sReplicaSet1.Name, Namespace: k8sReplicaSet1.Namespace,
		TargetPods: []types.PodRef{podRef1}}
	replicaSet2 := &types.ReplicaSet{Name: k8sReplicaSet2.Name, Namespace: k8sReplicaSet2.Namespace,
		TargetPods: []types.PodRef{podRef2}}
	statefulSet1 := &types.StatefulSet{Name: k8sStatefulSet1.Name, Namespace: k8sStatefulSet1.Namespace,
		TargetPods: []types.PodRef{podRef1}}
	statefulSet2 := &types.StatefulSet{Name: k8sStatefulSet2.Name, Namespace: k8sStatefulSet2.Namespace,
		TargetPods: []types.PodRef{podRef2}}
	daemonSet1 := &types.DaemonSet{Name: k8sDaemonSet1.Name, Namespace: k8sDaemonSet1.Namespace,
		TargetPods: []types.PodRef{podRef1}}
	daemonSet2 := &types.DaemonSet{Name: k8sDaemonSet2.Name, Namespace: k8sDaemonSet2.Namespace,
		TargetPods: []types.PodRef{podRef2}}
	replicaSetRef1 := types.ReplicaSetRef{Name: k8sReplicaSet1.Name, Namespace: k8sReplicaSet1.Namespace}
	replicaSetRef2 := types.ReplicaSetRef{Name: k8sReplicaSet2.Name, Namespace: k8sReplicaSet2.Namespace}
	deployment1 := &types.Deployment{Name: k8sDeployment1.Name, Namespace: k8sDeployment1.Namespace,
		TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef1}}
	deployment2 := &types.Deployment{Name: k8sDeployment2.Name, Namespace: k8sDeployment2.Namespace,
		TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef2}}
	var tests = []struct {
		name                   string
		mocks                  mocks
		args                   args
		expectedAnalysisResult types.AnalysisResult
	}{
		{
			name: "schedules analysis and posts results when cluster state changes",
			mocks: mocks{
				pods: []mockPodAnalyzerCall{
					{
						clusterState: pod.ClusterState{
							Pods: []*corev1.Pod{k8sPod1, k8sPod2},
						},
						returnValue: pod.AnalysisResult{
							Pods: []*types.Pod{pod1, pod2},
						},
					},
				},
				traffic: []mockTrafficAnalyzerCall{
					{
						clusterState: traffic.ClusterState{
							Pods:            []*corev1.Pod{k8sPod1, k8sPod2},
							Namespaces:      []*corev1.Namespace{k8sNamespace},
							NetworkPolicies: []*networkingv1.NetworkPolicy{k8sNetworkPolicy1, k8sNetworkPolicy2},
						},
						returnValue: traffic.AnalysisResult{
							Pods:          []*types.PodIsolation{podIsolation1, podIsolation2},
							AllowedRoutes: []*types.AllowedRoute{allowedRoute},
						},
					},
				},
				workload: []mockWorkloadAnalyzerCall{
					{
						clusterState: workload.ClusterState{
							Pods:         []*corev1.Pod{k8sPod1, k8sPod2},
							Services:     []*corev1.Service{k8sService1, k8sService2},
							ReplicaSets:  []*appsv1.ReplicaSet{k8sReplicaSet1, k8sReplicaSet2},
							StatefulSets: []*appsv1.StatefulSet{k8sStatefulSet1, k8sStatefulSet2},
							DaemonSets:   []*appsv1.DaemonSet{k8sDaemonSet1, k8sDaemonSet2},
							Deployments:  []*appsv1.Deployment{k8sDeployment1, k8sDeployment2},
						},
						returnValue: workload.AnalysisResult{
							Services:     []*types.Service{service1, service2},
							ReplicaSets:  []*types.ReplicaSet{replicaSet1, replicaSet2},
							StatefulSets: []*types.StatefulSet{statefulSet1, statefulSet2},
							DaemonSets:   []*types.DaemonSet{daemonSet1, daemonSet2},
							Deployments:  []*types.Deployment{deployment1, deployment2},
						},
					},
				},
			},
			args: args{
				clusterState: types.ClusterState{
					Namespaces:      []*corev1.Namespace{k8sNamespace},
					Pods:            []*corev1.Pod{k8sPod1, k8sPod2},
					Services:        []*corev1.Service{k8sService1, k8sService2},
					ReplicaSets:     []*appsv1.ReplicaSet{k8sReplicaSet1, k8sReplicaSet2},
					StatefulSets:    []*appsv1.StatefulSet{k8sStatefulSet1, k8sStatefulSet2},
					DaemonSets:      []*appsv1.DaemonSet{k8sDaemonSet1, k8sDaemonSet2},
					Deployments:     []*appsv1.Deployment{k8sDeployment1, k8sDeployment2},
					NetworkPolicies: []*networkingv1.NetworkPolicy{k8sNetworkPolicy1, k8sNetworkPolicy2},
				},
			},
			expectedAnalysisResult: types.AnalysisResult{
				Pods:          []*types.Pod{pod1, pod2},
				PodIsolations: []*types.PodIsolation{podIsolation1, podIsolation2},
				AllowedRoutes: []*types.AllowedRoute{allowedRoute},
				Services:      []*types.Service{service1, service2},
				ReplicaSets:   []*types.ReplicaSet{replicaSet1, replicaSet2},
				StatefulSets:  []*types.StatefulSet{statefulSet1, statefulSet2},
				DaemonSets:    []*types.DaemonSet{daemonSet1, daemonSet2},
				Deployments:   []*types.Deployment{deployment1, deployment2},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			podAnalyzer := createMockPodAnalyzer(t, tt.mocks.pods)
			trafficAnalyzer := createMockTrafficAnalyzer(t, tt.mocks.traffic)
			workloadAnalyzer := createMockWorkloadAnalyzer(t, tt.mocks.workload)
			analyzer := NewAnalysisScheduler(podAnalyzer, trafficAnalyzer, workloadAnalyzer)
			clusterStateChannel := make(chan types.ClusterState)
			resultsChannel := make(chan types.AnalysisResult)
			go analyzer.AnalyzeOnClusterStateChange(clusterStateChannel, resultsChannel)
			clusterStateChannel <- tt.args.clusterState
			analysisResult := <-resultsChannel
			if diff := cmp.Diff(tt.expectedAnalysisResult, analysisResult); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

type mockPodAnalyzerCall struct {
	clusterState pod.ClusterState
	returnValue  pod.AnalysisResult
}

type mockPodAnalyzer struct {
	t     *testing.T
	calls []mockPodAnalyzerCall
}

func (mock mockPodAnalyzer) Analyze(clusterState pod.ClusterState) pod.AnalysisResult {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.clusterState, clusterState) {
			return call.returnValue
		}
	}
	fmt.Printf("mockPodAnalyzer was called with unexpected arguments: \n")
	fmt.Printf("\tclusterState=%s\n", clusterState)
	mock.t.FailNow()
	panic("unreachable but required to compile")
}

func createMockPodAnalyzer(t *testing.T, calls []mockPodAnalyzerCall) pod.Analyzer {
	return mockPodAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockTrafficAnalyzerCall struct {
	clusterState traffic.ClusterState
	returnValue  traffic.AnalysisResult
}

type mockTrafficAnalyzer struct {
	t     *testing.T
	calls []mockTrafficAnalyzerCall
}

func (mock mockTrafficAnalyzer) Analyze(clusterState traffic.ClusterState) traffic.AnalysisResult {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.clusterState, clusterState) {
			return call.returnValue
		}
	}
	fmt.Printf("mockTrafficAnalyzer was called with unexpected arguments: \n")
	fmt.Printf("\tclusterState:%s\n", clusterState)
	mock.t.FailNow()
	panic("unreachable but required to compile")
}

func createMockTrafficAnalyzer(t *testing.T, calls []mockTrafficAnalyzerCall) traffic.Analyzer {
	return mockTrafficAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockWorkloadAnalyzerCall struct {
	clusterState workload.ClusterState
	returnValue  workload.AnalysisResult
}

type mockWorkloadAnalyzer struct {
	t     *testing.T
	calls []mockWorkloadAnalyzerCall
}

func (mock mockWorkloadAnalyzer) Analyze(clusterState workload.ClusterState) workload.AnalysisResult {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.clusterState, clusterState) {
			return call.returnValue
		}
	}
	fmt.Printf("mockWorkloadAnalyzer was called with unexpected arguments: \n")
	fmt.Printf("\tclusterState:%s\n", clusterState)
	mock.t.FailNow()
	panic("unreachable but required to compile")
}

func createMockWorkloadAnalyzer(t *testing.T, calls []mockWorkloadAnalyzerCall) workload.Analyzer {
	return mockWorkloadAnalyzer{
		t:     t,
		calls: calls,
	}
}
