package deployment

import (
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		deployment  *appsv1.Deployment
		replicaSets []*appsv1.ReplicaSet
	}
	tests := []struct {
		name                                    string
		args                                    args
		expectedDeploymentWithTargetReplicaSets *types.Deployment
	}{
		{
			name: "deployment name and namespace are propagated",
			args: args{
				deployment:  testutils.NewDeploymentBuilder().WithName("deploy").WithNamespace("ns").Build(),
				replicaSets: []*appsv1.ReplicaSet{},
			},
			expectedDeploymentWithTargetReplicaSets: &types.Deployment{
				Name:              "deploy",
				Namespace:         "ns",
				TargetReplicaSets: []types.ReplicaSetRef{},
			},
		},
		{
			name: "only replicaSets referencing deployment as owner are detected as target",
			args: args{
				deployment: testutils.NewDeploymentBuilder().WithUID("deploy-uid").Build(),
				replicaSets: []*appsv1.ReplicaSet{
					testutils.NewReplicaSetBuilder().WithName("name1").
						WithOwnerUID("deploy-uid").WithDesiredReplicas(2).Build(),
					testutils.NewReplicaSetBuilder().WithName("name2").
						WithOwnerUID("other-uid").WithDesiredReplicas(2).Build(),
					testutils.NewReplicaSetBuilder().WithName("name3").Build(),
				},
			},
			expectedDeploymentWithTargetReplicaSets: &types.Deployment{
				Namespace: "default",
				TargetReplicaSets: []types.ReplicaSetRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
		{
			name: "replicaSets with 0 desired replicas are ignored",
			args: args{
				deployment: testutils.NewDeploymentBuilder().WithUID("deploy-uid").Build(),
				replicaSets: []*appsv1.ReplicaSet{
					testutils.NewReplicaSetBuilder().WithName("name1").
						WithOwnerUID("deploy-uid").WithDesiredReplicas(2).Build(),
					testutils.NewReplicaSetBuilder().WithName("name2").
						WithOwnerUID("deploy-uid").WithDesiredReplicas(0).Build(),
				},
			},
			expectedDeploymentWithTargetReplicaSets: &types.Deployment{
				Namespace: "default",
				TargetReplicaSets: []types.ReplicaSetRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			deploymentWithTargetReplicaSets := analyzer.Analyze(tt.args.deployment, tt.args.replicaSets)
			if diff := cmp.Diff(tt.expectedDeploymentWithTargetReplicaSets, deploymentWithTargetReplicaSets); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
