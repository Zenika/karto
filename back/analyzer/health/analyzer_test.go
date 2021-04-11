package health

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/health/podhealth"
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
		podHealth []mockPodHealthAnalyzerCall
	}
	k8sPod1 := testutils.NewPodBuilder().WithContainerStatus(true, false, 0).Build()
	k8sPod2 := testutils.NewPodBuilder().WithContainerStatus(true, false, 0).
		WithContainerStatus(false, false, 0).Build()
	podRef1 := types.PodRef{Name: k8sPod1.Name, Namespace: k8sPod1.Namespace}
	podRef2 := types.PodRef{Name: k8sPod2.Name, Namespace: k8sPod2.Namespace}
	podHealth1 := &types.PodHealth{Pod: podRef1, Containers: 1, ContainersRunning: 1, ContainersReady: 0,
		ContainersWithoutRestart: 1}
	podHealth2 := &types.PodHealth{Pod: podRef2, Containers: 2, ContainersRunning: 1, ContainersReady: 0,
		ContainersWithoutRestart: 2}
	tests := []struct {
		name                   string
		mocks                  mocks
		args                   args
		expectedAnalysisResult AnalysisResult
	}{
		{
			name: "delegates to sub-analyzers and merges results",
			mocks: mocks{
				podHealth: []mockPodHealthAnalyzerCall{
					{
						args: mockPodHealthAnalyzerCallArgs{
							pod: k8sPod1,
						},
						returnValue: podHealth1,
					},
					{
						args: mockPodHealthAnalyzerCallArgs{
							pod: k8sPod2,
						},
						returnValue: podHealth2,
					},
				},
			},
			args: args{
				clusterState: ClusterState{
					Pods: []*corev1.Pod{k8sPod1, k8sPod2},
				},
			},
			expectedAnalysisResult: AnalysisResult{
				Pods: []*types.PodHealth{podHealth1, podHealth2},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			podHealthAnalyzer := createMockPodHealthAnalyzer(t, tt.mocks.podHealth)
			analyzer := NewAnalyzer(podHealthAnalyzer)
			analysisResult := analyzer.Analyze(tt.args.clusterState)
			if diff := cmp.Diff(tt.expectedAnalysisResult, analysisResult); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

type mockPodHealthAnalyzerCallArgs struct {
	pod *corev1.Pod
}

type mockPodHealthAnalyzerCall struct {
	args        mockPodHealthAnalyzerCallArgs
	returnValue *types.PodHealth
}

type mockPodHealthAnalyzer struct {
	t     *testing.T
	calls []mockPodHealthAnalyzerCall
}

func (mock mockPodHealthAnalyzer) Analyze(pod *corev1.Pod) *types.PodHealth {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.pod, pod) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockPodHealthAnalyzer was called with unexpected arguments:\n\tpod: %s\n", pod)
	return nil
}

func createMockPodHealthAnalyzer(t *testing.T, calls []mockPodHealthAnalyzerCall) podhealth.Analyzer {
	return mockPodHealthAnalyzer{
		t:     t,
		calls: calls,
	}
}
