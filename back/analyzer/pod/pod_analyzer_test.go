package pod

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		clusterState ClusterState
	}
	tests := []struct {
		name                   string
		args                   args
		expectedAnalysisResult AnalysisResult
	}{
		{
			name: "pod info are propagated",
			args: args{
				clusterState: ClusterState{
					Pods: []*corev1.Pod{
						testutils.NewPodBuilder().WithName("name1").WithNamespace("ns1").
							WithLabel("k1", "foo").Build(),
						testutils.NewPodBuilder().WithName("name2").WithNamespace("ns2").
							WithLabel("k1", "bar").WithLabel("k2", "baz").Build(),
					},
				},
			},
			expectedAnalysisResult: AnalysisResult{
				Pods: []*types.Pod{
					{Name: "name1", Namespace: "ns1", Labels: map[string]string{"k1": "foo"}},
					{Name: "name2", Namespace: "ns2", Labels: map[string]string{"k1": "bar", "k2": "baz"}},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			analysisResult := analyzer.Analyze(tt.args.clusterState)
			if diff := cmp.Diff(tt.expectedAnalysisResult, analysisResult); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
