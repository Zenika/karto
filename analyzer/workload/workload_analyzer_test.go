package workload

import (
	"fmt"
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/workload/deployment"
	"karto/analyzer/workload/replicaset"
	"karto/analyzer/workload/service"
	"karto/testutils"
	"karto/types"
	"reflect"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		pods        []*corev1.Pod
		services    []*corev1.Service
		replicaSets []*appsv1.ReplicaSet
		deployments []*appsv1.Deployment
	}
	type mocks struct {
		service    []mockServiceAnalyzerCall
		replicaSet []mockReplicaSetAnalyzerCall
		deployment []mockDeploymentAnalyzerCall
	}
	pod1 := testutils.NewPodBuilder().WithName("pod1").WithNamespace("ns").Build()
	pod2 := testutils.NewPodBuilder().WithName("pod2").WithNamespace("ns").Build()
	pod3 := testutils.NewPodBuilder().WithName("pod3").WithNamespace("ns").Build()
	service1 := testutils.NewServiceBuilder().WithName("svc1").WithNamespace("ns").Build()
	service2 := testutils.NewServiceBuilder().WithName("svc2").WithNamespace("ns").Build()
	replicaSet1 := testutils.NewReplicaSetBuilder().WithName("rs1").WithNamespace("ns").Build()
	replicaSet2 := testutils.NewReplicaSetBuilder().WithName("rs2").WithNamespace("ns").Build()
	deployment1 := testutils.NewDeploymentBuilder().WithName("deploy1").WithNamespace("ns").Build()
	deployment2 := testutils.NewDeploymentBuilder().WithName("deploy2").WithNamespace("ns").Build()
	podRef1 := types.PodRef{Name: pod1.Name, Namespace: pod1.Namespace}
	podRef2 := types.PodRef{Name: pod2.Name, Namespace: pod2.Namespace}
	podRef3 := types.PodRef{Name: pod3.Name, Namespace: pod3.Namespace}
	service1WithTargetPods := &types.Service{Name: service1.Name, Namespace: service1.Namespace, TargetPods: []types.PodRef{podRef1}}
	service2WithTargetPods := &types.Service{Name: service2.Name, Namespace: service2.Namespace, TargetPods: []types.PodRef{podRef2, podRef3}}
	replicaSet1WithTargetPods := &types.ReplicaSet{Name: replicaSet1.Name, Namespace: replicaSet1.Namespace, TargetPods: []types.PodRef{podRef1, podRef2}}
	replicaSet2WithTargetPods := &types.ReplicaSet{Name: replicaSet2.Name, Namespace: replicaSet2.Namespace, TargetPods: []types.PodRef{podRef3}}
	replicaSetRef1 := types.ReplicaSetRef{Name: replicaSet1.Name, Namespace: replicaSet1.Namespace}
	replicaSetRef2 := types.ReplicaSetRef{Name: replicaSet2.Name, Namespace: replicaSet2.Namespace}
	deployment1WithTargetReplicaSets := &types.Deployment{Name: deployment1.Name, Namespace: deployment1.Namespace, TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef1}}
	deployment2WithTargetReplicaSets := &types.Deployment{Name: deployment2.Name, Namespace: deployment2.Namespace, TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef2}}
	var tests = []struct {
		name                string
		mocks               mocks
		args                args
		expectedServices    []*types.Service
		expectedReplicaSets []*types.ReplicaSet
		expectedDeployments []*types.Deployment
	}{
		{
			name: "should delegate to service and replicaSet and deployment analyzers",
			mocks: mocks{
				service: []mockServiceAnalyzerCall{
					{
						args: mockServiceAnalyzerCallArgs{
							service: service1,
							pods:    []*corev1.Pod{pod1, pod2, pod3},
						},
						returnValue: service1WithTargetPods,
					},
					{
						args: mockServiceAnalyzerCallArgs{
							service: service2,
							pods:    []*corev1.Pod{pod1, pod2, pod3},
						},
						returnValue: service2WithTargetPods,
					},
				},
				replicaSet: []mockReplicaSetAnalyzerCall{
					{
						args: mockReplicaSetAnalyzerCallArgs{
							replicaSet: replicaSet1,
							pods:       []*corev1.Pod{pod1, pod2, pod3},
						},
						returnValue: replicaSet1WithTargetPods,
					},
					{
						args: mockReplicaSetAnalyzerCallArgs{
							replicaSet: replicaSet2,
							pods:       []*corev1.Pod{pod1, pod2, pod3},
						},
						returnValue: replicaSet2WithTargetPods,
					},
				},
				deployment: []mockDeploymentAnalyzerCall{
					{
						args: mockDeploymentAnalyzerCallArgs{
							deployment:  deployment1,
							replicaSets: []*appsv1.ReplicaSet{replicaSet1, replicaSet2},
						},
						returnValue: deployment1WithTargetReplicaSets,
					},
					{
						args: mockDeploymentAnalyzerCallArgs{
							deployment:  deployment2,
							replicaSets: []*appsv1.ReplicaSet{replicaSet1, replicaSet2},
						},
						returnValue: deployment2WithTargetReplicaSets,
					},
				},
			},
			args: args{
				pods:        []*corev1.Pod{pod1, pod2, pod3},
				services:    []*corev1.Service{service1, service2},
				replicaSets: []*appsv1.ReplicaSet{replicaSet1, replicaSet2},
				deployments: []*appsv1.Deployment{deployment1, deployment2},
			},
			expectedServices:    []*types.Service{service1WithTargetPods, service2WithTargetPods},
			expectedReplicaSets: []*types.ReplicaSet{replicaSet1WithTargetPods, replicaSet2WithTargetPods},
			expectedDeployments: []*types.Deployment{deployment1WithTargetReplicaSets, deployment2WithTargetReplicaSets},
		},
	}
	for _, tt := range tests {
		serviceAnalyzer := createMockServiceAnalyzer(t, tt.mocks.service)
		replicaSetAnalyzer := createMockReplicaSetAnalyzer(t, tt.mocks.replicaSet)
		deploymentAnalyzer := createMockDeploymentAnalyzer(t, tt.mocks.deployment)
		analyzer := analyzerImpl{
			serviceAnalyzer:    serviceAnalyzer,
			replicaSetAnalyzer: replicaSetAnalyzer,
			deploymentAnalyzer: deploymentAnalyzer,
		}
		t.Run(tt.name, func(t *testing.T) {
			services, replicaSets, deployments := analyzer.Analyze(tt.args.pods, tt.args.services, tt.args.replicaSets, tt.args.deployments)
			if diff := cmp.Diff(tt.expectedServices, services); diff != "" {
				t.Errorf("Analyze() services result mismatch (-want +got):\n%s", diff)
			}
			if diff := cmp.Diff(tt.expectedReplicaSets, replicaSets); diff != "" {
				t.Errorf("Analyze() replicaSets result mismatch (-want +got):\n%s", diff)
			}
			if diff := cmp.Diff(tt.expectedDeployments, deployments); diff != "" {
				t.Errorf("Analyze() deployments result mismatch (-want +got):\n%s", diff)
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
	fmt.Printf("mockServiceAnalyzer was called with unexpected arguments: \n")
	fmt.Printf("\tservice:%s\n", service)
	fmt.Printf("\tpods=%s\n", pods)
	mock.t.FailNow()
	panic("unreachable but required to compile")
}

func createMockServiceAnalyzer(t *testing.T, calls []mockServiceAnalyzerCall) service.Analyzer {
	return mockServiceAnalyzer{
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
	fmt.Printf("mockReplicaSetAnalyzer was called with unexpected arguments: \n")
	fmt.Printf("\treplicaSet:%s\n", replicaSet)
	fmt.Printf("\tpods=%s\n", pods)
	mock.t.FailNow()
	panic("unreachable but required to compile")
}

func createMockReplicaSetAnalyzer(t *testing.T, calls []mockReplicaSetAnalyzerCall) replicaset.Analyzer {
	return mockReplicaSetAnalyzer{
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

func (mock mockDeploymentAnalyzer) Analyze(deployment *appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) *types.Deployment {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.deployment, deployment) &&
			reflect.DeepEqual(call.args.replicaSets, replicaSets) {
			return call.returnValue
		}
	}
	fmt.Printf("mockDeploymentAnalyzer was called with unexpected arguments: \n")
	fmt.Printf("\tdeployment:%s\n", deployment)
	fmt.Printf("\treplicaSets=%s\n", replicaSets)
	mock.t.FailNow()
	panic("unreachable but required to compile")
}

func createMockDeploymentAnalyzer(t *testing.T, calls []mockDeploymentAnalyzerCall) deployment.Analyzer {
	return mockDeploymentAnalyzer{
		t:     t,
		calls: calls,
	}
}
