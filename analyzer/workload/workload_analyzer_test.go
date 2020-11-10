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
	k8sPod1 := testutils.NewPodBuilder().WithName("pod1").WithNamespace("ns").Build()
	k8sPod2 := testutils.NewPodBuilder().WithName("pod2").WithNamespace("ns").Build()
	k8sPod3 := testutils.NewPodBuilder().WithName("pod3").WithNamespace("ns").Build()
	k8sService1 := testutils.NewServiceBuilder().WithName("svc1").WithNamespace("ns").Build()
	k8sService2 := testutils.NewServiceBuilder().WithName("svc2").WithNamespace("ns").Build()
	k8sReplicaSet1 := testutils.NewReplicaSetBuilder().WithName("rs1").WithNamespace("ns").Build()
	k8sReplicaSet2 := testutils.NewReplicaSetBuilder().WithName("rs2").WithNamespace("ns").Build()
	k8sDeployment1 := testutils.NewDeploymentBuilder().WithName("deploy1").WithNamespace("ns").Build()
	k8sDeployment2 := testutils.NewDeploymentBuilder().WithName("deploy2").WithNamespace("ns").Build()
	podRef1 := types.PodRef{Name: k8sPod1.Name, Namespace: k8sPod1.Namespace}
	podRef2 := types.PodRef{Name: k8sPod2.Name, Namespace: k8sPod2.Namespace}
	podRef3 := types.PodRef{Name: k8sPod3.Name, Namespace: k8sPod3.Namespace}
	service1 := &types.Service{Name: k8sService1.Name, Namespace: k8sService1.Namespace, TargetPods: []types.PodRef{podRef1}}
	service2 := &types.Service{Name: k8sService2.Name, Namespace: k8sService2.Namespace, TargetPods: []types.PodRef{podRef2, podRef3}}
	replicaSet1 := &types.ReplicaSet{Name: k8sReplicaSet1.Name, Namespace: k8sReplicaSet1.Namespace, TargetPods: []types.PodRef{podRef1, podRef2}}
	replicaSet2 := &types.ReplicaSet{Name: k8sReplicaSet2.Name, Namespace: k8sReplicaSet2.Namespace, TargetPods: []types.PodRef{podRef3}}
	replicaSetRef1 := types.ReplicaSetRef{Name: k8sReplicaSet1.Name, Namespace: k8sReplicaSet1.Namespace}
	replicaSetRef2 := types.ReplicaSetRef{Name: k8sReplicaSet2.Name, Namespace: k8sReplicaSet2.Namespace}
	deployment1 := &types.Deployment{Name: k8sDeployment1.Name, Namespace: k8sDeployment1.Namespace, TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef1}}
	deployment2 := &types.Deployment{Name: k8sDeployment2.Name, Namespace: k8sDeployment2.Namespace, TargetReplicaSets: []types.ReplicaSetRef{replicaSetRef2}}
	var tests = []struct {
		name                string
		mocks               mocks
		args                args
		expectedServices    []*types.Service
		expectedReplicaSets []*types.ReplicaSet
		expectedDeployments []*types.Deployment
	}{
		{
			name: "delegates to service and replicaSet and deployment analyzers",
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
				pods:        []*corev1.Pod{k8sPod1, k8sPod2, k8sPod3},
				services:    []*corev1.Service{k8sService1, k8sService2},
				replicaSets: []*appsv1.ReplicaSet{k8sReplicaSet1, k8sReplicaSet2},
				deployments: []*appsv1.Deployment{k8sDeployment1, k8sDeployment2},
			},
			expectedServices:    []*types.Service{service1, service2},
			expectedReplicaSets: []*types.ReplicaSet{replicaSet1, replicaSet2},
			expectedDeployments: []*types.Deployment{deployment1, deployment2},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			serviceAnalyzer := createMockServiceAnalyzer(t, tt.mocks.service)
			replicaSetAnalyzer := createMockReplicaSetAnalyzer(t, tt.mocks.replicaSet)
			deploymentAnalyzer := createMockDeploymentAnalyzer(t, tt.mocks.deployment)
			analyzer := analyzerImpl{
				serviceAnalyzer:    serviceAnalyzer,
				replicaSetAnalyzer: replicaSetAnalyzer,
				deploymentAnalyzer: deploymentAnalyzer,
			}
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
